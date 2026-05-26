/**
 * POST /api/monitor — Aciona o monitor de proposições
 *
 * Este endpoint é chamado:
 *   1. Manualmente pelo usuário (via botão "Buscar agora" no Dashboard)
 *   2. Automaticamente pelo Vercel Cron (com header Authorization: Bearer <CRON_SECRET>)
 *
 * O que ele faz:
 *   - Busca as keywords ativas no banco
 *   - Para cada keyword, consulta a Câmara Federal e raspa a Câmara POA
 *   - Salva proposições novas no banco
 *   - Gera notificações para proposições novas e tramitações
 *   - Busca votações próximas
 *
 * Parâmetros de query:
 *   ?mode=weekly  — inclui resumo semanal nas notificações
 *   ?secret=...   — validação do cron (alternativa ao header)
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  buscarProposicoesPorKeywords,
  buscarVotacoes,
  buscarTramitacoes,
} from "@/lib/api/camara-federal";
import { buscarProposicoesPOAPorKeywords } from "@/lib/api/camara-poa";
import { gerarResumoSemanal } from "@/lib/ai/summarizer";
import { format, subDays } from "date-fns";
import type { Proposicao } from "@/types";

// Autentica chamadas do Cron Job
function autorizarCron(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // sem segredo configurado, aceita tudo (dev)

  const headerAuth = req.headers.get("authorization");
  const querySecret = req.nextUrl.searchParams.get("secret");

  return (
    headerAuth === `Bearer ${secret}` || querySecret === secret
  );
}

export async function POST(req: NextRequest) {
  // Valida autenticação para chamadas externas (cron)
  // Chamadas do próprio frontend são sempre aceitas
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

// ─── Lógica principal do monitor ─────────────────────────────────────────────

async function executarMonitor(isWeekly: boolean) {
  const keywords = await prisma.keyword.findMany({
    where: { active: true },
    select: { id: true, text: true },
  });

  if (keywords.length === 0) {
    return { novas: 0, atualizadas: 0, votacoes: 0, mensagem: "Nenhuma keyword configurada" };
  }

  const keywordTexts = keywords.map((k) => k.text);

  // Data de início: busca dos últimos 7 dias para não perder nada
  const dataInicio = format(subDays(new Date(), 7), "yyyy-MM-dd");

  // Busca em paralelo: Federal e POA
  const [federalProposicoes, poaProposicoes] = await Promise.allSettled([
    buscarProposicoesPorKeywords(keywordTexts, dataInicio),
    buscarProposicoesPOAPorKeywords(keywordTexts),
  ]);

  const todasProposicoes: Proposicao[] = [
    ...(federalProposicoes.status === "fulfilled" ? federalProposicoes.value : []),
    ...(poaProposicoes.status === "fulfilled" ? poaProposicoes.value : []),
  ];

  // Salva proposições e contabiliza novas vs. atualizadas
  let novas = 0;
  let atualizadas = 0;

  for (const proposicao of todasProposicoes) {
    const keywordsQueMatcaram = keywords.filter((k) =>
      proposicao.ementa.toLowerCase().includes(k.text.toLowerCase())
    );

    const existente = await prisma.proposicao.findUnique({
      where: { id: proposicao.id },
      select: { id: true, status: true },
    });

    if (!existente) {
      // Nova proposição
      await prisma.proposicao.create({
        data: {
          id: proposicao.id,
          numero: proposicao.numero,
          ano: proposicao.ano,
          siglaTipo: proposicao.siglaTipo,
          ementa: proposicao.ementa,
          ementaDetalhada: proposicao.ementaDetalhada,
          dataApresentacao: new Date(proposicao.dataApresentacao),
          autor: proposicao.autor,
          casa: proposicao.casa,
          urlOriginal: proposicao.urlOriginal,
          status: proposicao.status,
          orgaoStatus: proposicao.orgaoStatus,
          keywords: {
            create: keywordsQueMatcaram.map((k) => ({
              keyword: { connect: { id: k.id } },
            })),
          },
        },
      });

      // Notificação de nova proposição
      await prisma.notification.create({
        data: {
          tipo: "nova_proposicao",
          titulo: `📋 Nova proposição sobre ${keywordsQueMatcaram[0]?.text ?? "tema monitorado"}`,
          mensagem: `${proposicao.siglaTipo} ${proposicao.numero}/${proposicao.ano}: ${
            proposicao.ementa.slice(0, 150)
          }…`,
          proposicaoId: proposicao.id,
        },
      });

      novas++;

      // Busca tramitação (apenas federais têm API de tramitação)
      if (proposicao.casa === "federal") {
        await salvarTramitacoes(proposicao.id);
      }
    } else if (existente.status !== proposicao.status) {
      // Proposição existente com status atualizado
      await prisma.proposicao.update({
        where: { id: proposicao.id },
        data: { status: proposicao.status, orgaoStatus: proposicao.orgaoStatus },
      });

      await prisma.notification.create({
        data: {
          tipo: "tramitacao",
          titulo: `✅ ${proposicao.siglaTipo} ${proposicao.numero}/${proposicao.ano} atualizado`,
          mensagem: `Novo status: ${proposicao.status}`,
          proposicaoId: proposicao.id,
        },
      });

      atualizadas++;
    }
  }

  // Busca votações próximas (próximos 7 dias)
  const dataFim = format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd");
  const votacoes = await buscarVotacoes(dataInicio, dataFim);
  let votacoesNovas = 0;

  for (const v of votacoes) {
    const existeVotacao = await prisma.votacao.findUnique({ where: { id: v.id } });
    if (!existeVotacao) {
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

      // Alerta para votações no próximo dia
      const horasAte =
        (new Date(v.dataHora).getTime() - Date.now()) / (1000 * 60 * 60);

      if (horasAte > 0 && horasAte <= 24) {
        await prisma.notification.create({
          data: {
            tipo: "votacao",
            titulo: `🗳️ Votação em ${Math.round(horasAte)}h: ${v.orgao}`,
            mensagem: v.descricao,
          },
        });
      }

      votacoesNovas++;
    }
  }

  // Resumo semanal (apenas às segundas-feiras)
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

  return { novas, atualizadas, votacoes: votacoesNovas };
}

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
        update: {},
        create: {
          id: t.id,
          proposicaoId: t.proposicaoId,
          sequencia: t.sequencia,
          descricao: t.descricao,
          orgao: t.orgao,
          data: new Date(t.data),
        },
      });
    }
  } catch {
    // Tramitação é opcional — não falha o processo todo
  }
}
