/**
 * POST /api/monitor — Aciona o monitor de proposições
 *
 * Chamado:
 *   1. Manualmente pelo usuário (botão "Buscar agora" no Dashboard)
 *   2. Pelo Vercel Cron (header Authorization: Bearer <CRON_SECRET>)
 *
 * Fluxo:
 *   1. Busca keywords ativas no banco
 *   2. Para cada keyword → /proposicoes da Câmara Federal (lista básica)
 *   3. Para proposições novas → /proposicoes/{id} + /autores (dados completos)
 *   4. Salva no banco + gera notificações
 *   5. Busca tramitações de cada PL novo
 *   6. Busca votações recentes
 *   7. (Opcional) Gera resumo semanal com IA
 *
 * Query params:
 *   ?mode=weekly   — inclui resumo semanal
 *   ?secret=...    — autenticação alternativa para cron
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buscarProposicoesPorKeywords,
  buscarDetalheProposicao,
  buscarVotacoes,
  buscarTramitacoes,
} from "@/lib/api/camara-federal";
import { buscarProposicoesPOAPorKeywords } from "@/lib/api/camara-poa";
import { gerarResumoSemanal } from "@/lib/ai/summarizer";
import { sleep } from "@/lib/utils";
import { format, subDays } from "date-fns";
import type { Proposicao } from "@/types";

// ─── Autenticação do Cron ─────────────────────────────────────────────────────

function autorizarCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // em dev, sem segredo configurado aceita tudo

  const headerAuth = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");
  return headerAuth === `Bearer ${secret}` || querySecret === secret;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const isExternalCron = req.headers.get("x-vercel-cron") === "1";
  if (isExternalCron && !autorizarCron(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const isWeekly = req.nextUrl.searchParams.get("mode") === "weekly";

  try {
    const resultado = await executarMonitor(isWeekly);
    return NextResponse.json({ data: resultado });
  } catch (error) {
    console.error("[Monitor] Erro:", error);
    return NextResponse.json(
      {
        error: "Erro ao executar monitor",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// =============================================================================
// LÓGICA PRINCIPAL
// =============================================================================

async function executarMonitor(isWeekly: boolean) {
  const keywords = await prisma.keyword.findMany({
    where: { active: true },
    select: { id: true, text: true },
  });

  if (keywords.length === 0) {
    return {
      novas: 0,
      atualizadas: 0,
      votacoes: 0,
      mensagem: "Nenhuma keyword configurada. Adicione temas em /temas.",
    };
  }

  const keywordTexts = keywords.map((k) => k.text);

  // Janela de busca: últimos 30 dias (para não perder PLs em tramitação)
  const dataInicio = format(subDays(new Date(), 30), "yyyy-MM-dd");

  console.log(`[Monitor] Buscando ${keywords.length} keywords desde ${dataInicio}…`);

  // ─── 1. Busca em paralelo: Federal e POA ───────────────────────────────────
  const [federalResult, poaResult] = await Promise.allSettled([
    buscarProposicoesPorKeywords(keywordTexts, dataInicio),
    buscarProposicoesPOAPorKeywords(keywordTexts),
  ]);

  if (federalResult.status === "rejected") {
    console.error("[Monitor] Falha na busca federal:", federalResult.reason);
  }
  if (poaResult.status === "rejected") {
    console.warn("[Monitor] Falha na busca POA (scraping):", poaResult.reason);
  }

  const federalBrutos: Proposicao[] =
    federalResult.status === "fulfilled" ? federalResult.value : [];
  const poaProposicoes: Proposicao[] =
    poaResult.status === "fulfilled" ? poaResult.value : [];

  // ─── 2. Enriquece dados federais com detalhe + autores ────────────────────
  // A listagem da API retorna campos mínimos (sem autor real, sem status completo).
  // Para proposições novas, busca o detalhe completo.
  const federalProposicoes = await enriquecerProposicoesFederais(federalBrutos, keywordTexts);

  const todasProposicoes = [...federalProposicoes, ...poaProposicoes];

  console.log(`[Monitor] ${federalProposicoes.length} federais + ${poaProposicoes.length} POA = ${todasProposicoes.length} total`);

  // ─── 3. Salva no banco e gera notificações ────────────────────────────────
  let novas = 0;
  let atualizadas = 0;

  for (const proposicao of todasProposicoes) {
    const keywordsMatched = keywords.filter((k) =>
      proposicao.ementa.toLowerCase().includes(k.text.toLowerCase())
    );

    const existente = await prisma.proposicao.findUnique({
      where: { id: proposicao.id },
      select: { id: true, status: true, orgaoStatus: true },
    });

    if (!existente) {
      // Nova proposição — salva com todos os campos
      await prisma.proposicao.create({
        data: {
          id: proposicao.id,
          numero: proposicao.numero,
          ano: proposicao.ano,
          siglaTipo: proposicao.siglaTipo,
          descricaoTipo: proposicao.descricaoTipo,
          ementa: proposicao.ementa,
          ementaDetalhada: proposicao.ementaDetalhada,
          keywordsApi: proposicao.keywordsApi,
          dataApresentacao: new Date(proposicao.dataApresentacao),
          autor: proposicao.autor,
          autorUri: proposicao.autorUri,
          casa: proposicao.casa,
          urlOriginal: proposicao.urlOriginal,
          status: proposicao.status,
          orgaoStatus: proposicao.orgaoStatus,
          regime: proposicao.regime,
          apreciacao: proposicao.apreciacao,
          codSituacao: proposicao.codSituacao,
          keywords: {
            create: keywordsMatched.map((k) => ({
              keyword: { connect: { id: k.id } },
            })),
          },
        },
      });

      await prisma.notification.create({
        data: {
          tipo: "nova_proposicao",
          titulo: `📋 Nova proposição sobre "${keywordsMatched[0]?.text ?? "tema monitorado"}"`,
          mensagem: `${proposicao.siglaTipo} ${proposicao.numero}/${proposicao.ano}: ${
            proposicao.ementa.slice(0, 180)
          }${proposicao.ementa.length > 180 ? "…" : ""}`,
          proposicaoId: proposicao.id,
        },
      });

      novas++;

      // Busca tramitações para proposições federais (POA não tem API)
      if (proposicao.casa === "federal") {
        await salvarTramitacoes(proposicao.id);
        await sleep(200); // respeita a API
      }
    } else {
      // Proposição já existente — verifica se mudou de status
      const mudouStatus = existente.status !== proposicao.status;
      const mudouOrgao = existente.orgaoStatus !== proposicao.orgaoStatus;

      if (mudouStatus || mudouOrgao) {
        await prisma.proposicao.update({
          where: { id: proposicao.id },
          data: {
            status: proposicao.status,
            orgaoStatus: proposicao.orgaoStatus,
            regime: proposicao.regime,
            apreciacao: proposicao.apreciacao,
            codSituacao: proposicao.codSituacao,
          },
        });

        await prisma.notification.create({
          data: {
            tipo: "tramitacao",
            titulo: `✅ ${proposicao.siglaTipo} ${proposicao.numero}/${proposicao.ano} avançou`,
            mensagem: `Novo status: ${proposicao.status}${
              proposicao.orgaoStatus ? ` (${proposicao.orgaoStatus})` : ""
            }`,
            proposicaoId: proposicao.id,
          },
        });

        // Atualiza tramitações quando status mudar
        if (proposicao.casa === "federal") {
          await salvarTramitacoes(proposicao.id);
        }

        atualizadas++;
      }
    }
  }

  // ─── 4. Votações recentes ─────────────────────────────────────────────────
  const dataFim = format(new Date(), "yyyy-MM-dd");
  const votacoes = await buscarVotacoes(dataInicio, dataFim);
  let votacoesNovas = 0;

  for (const v of votacoes) {
    const existe = await prisma.votacao.findUnique({ where: { id: v.id } });
    if (!existe) {
      await prisma.votacao.create({
        data: {
          id: v.id,
          descricao: v.descricao,
          orgao: v.orgao,
          dataHora: new Date(v.dataHora),
          resultado: v.resultado,
          uri: v.uri,
        },
      });

      const horasAte = (new Date(v.dataHora).getTime() - Date.now()) / 3_600_000;
      if (horasAte > 0 && horasAte <= 24) {
        await prisma.notification.create({
          data: {
            tipo: "votacao",
            titulo: `🗳️ Votação em ${Math.round(horasAte)}h — ${v.orgao}`,
            mensagem: v.descricao,
          },
        });
      }

      votacoesNovas++;
    }
  }

  // ─── 5. Resumo semanal (apenas quando mode=weekly) ────────────────────────
  if (isWeekly && novas > 0) {
    const resumo = await gerarResumoSemanal(
      todasProposicoes.slice(0, 15),
      keywordTexts
    );

    if (resumo) {
      await prisma.notification.create({
        data: {
          tipo: "resumo_semanal",
          titulo: `📊 Resumo semanal: ${novas} nova(s) proposição(ões)`,
          mensagem: resumo.slice(0, 500),
        },
      });
    }
  }

  console.log(`[Monitor] Concluído: ${novas} novas, ${atualizadas} atualizadas, ${votacoesNovas} votações`);

  return { novas, atualizadas, votacoes: votacoesNovas };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Para cada proposição da listagem (dados básicos), busca o detalhe completo
 * somente se ela for nova no banco. Evita chamar a API para PLs já salvos.
 */
async function enriquecerProposicoesFederais(
  brutos: Proposicao[],
  keywordTexts: string[]
): Promise<Proposicao[]> {
  const resultado: Proposicao[] = [];

  for (const p of brutos) {
    const jaExiste = await prisma.proposicao.findUnique({
      where: { id: p.id },
      select: { id: true, status: true },
    });

    if (jaExiste) {
      // Proposição já no banco — inclui para verificar atualização de status
      // mas não precisa buscar detalhe completo novamente
      resultado.push({ ...p, status: jaExiste.status });
      continue;
    }

    // Proposição nova — busca dados completos (autor, status real, keywords, etc.)
    try {
      const detalhe = await buscarDetalheProposicao(p.id);
      resultado.push(detalhe ?? p);
      await sleep(300);
    } catch {
      // Se falhar no detalhe, usa o item básico da listagem
      resultado.push(p);
    }
  }

  return resultado;
}

/**
 * Busca e salva o histórico de tramitação de uma proposição federal.
 * Usa upsert para não duplicar etapas já salvas.
 */
async function salvarTramitacoes(proposicaoId: string) {
  try {
    const tramitacoes = await buscarTramitacoes(proposicaoId);

    for (const t of tramitacoes) {
      await prisma.tramitacao.upsert({
        where: {
          proposicaoId_sequencia: {
            proposicaoId: t.proposicaoId,
            sequencia: t.sequencia,
          },
        },
        update: {
          // Atualiza campos que podem mudar entre consultas
          descricaoSituacao: t.descricaoSituacao,
          despacho: t.despacho,
        },
        create: {
          id: t.id,
          proposicaoId: t.proposicaoId,
          sequencia: t.sequencia,
          descricaoTramitacao: t.descricaoTramitacao,
          descricaoSituacao: t.descricaoSituacao,
          despacho: t.despacho,
          orgao: t.orgao,
          regime: t.regime,
          urlDocumento: t.urlDocumento,
          data: new Date(t.data),
        },
      });
    }
  } catch (err) {
    // Tramitação é enriquecimento opcional — não interrompe o processo
    console.warn(`[Monitor] Falha ao salvar tramitações de ${proposicaoId}:`, err);
  }
}
