/**
 * Cliente para a API de Dados Abertos da Câmara dos Deputados
 *
 * Documentação oficial: https://dadosabertos.camara.leg.br/swagger/api.html
 * Base URL: https://dadosabertos.camara.leg.br/api/v2
 *
 * A API é pública e não requer autenticação.
 * Recomenda-se respeitar um intervalo mínimo entre requisições.
 */

import axios from "axios";
import {
  type CamaraFederalProposicaoItem,
  type CamaraFederalProposicaoDetalhes,
  type CamaraFederalTramitacao,
  type CamaraFederalVotacao,
  type Proposicao,
  type Tramitacao,
  type Votacao,
} from "@/types";
import { sleep, getDefaultHeaders, generatePoaId } from "@/lib/utils";

const BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";
const REQUEST_DELAY_MS = 500; // intervalo entre requisições para não sobrecarregar a API

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: getDefaultHeaders(),
});

// ─── Proposições ──────────────────────────────────────────────────────────────

/**
 * Busca proposições que contenham uma palavra-chave na ementa.
 *
 * @param keyword - Termo de busca (ex: "inteligência artificial")
 * @param dataInicio - Buscar a partir desta data (AAAA-MM-DD)
 * @param pagina - Página de resultados (padrão: 1)
 * @returns Lista de proposições normalizadas
 */
export async function buscarProposicoesPorKeyword(
  keyword: string,
  dataInicio?: string,
  pagina = 1
): Promise<Proposicao[]> {
  const params: Record<string, string | number> = {
    keywords: keyword,
    ordem: "DESC",
    ordenarPor: "dataApresentacao",
    itens: 20,
    pagina,
  };

  // Filtra por data para evitar resultados muito antigos
  if (dataInicio) {
    params.dataInicio = dataInicio;
  }

  try {
    const response = await client.get<{ dados: CamaraFederalProposicaoItem[] }>(
      "/proposicoes",
      { params }
    );

    return response.data.dados.map((item) =>
      normalizarProposicaoFederal(item, keyword)
    );
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return [];
    }
    throw new Error(
      `Erro ao buscar proposições federais: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

/**
 * Busca proposições de múltiplas keywords em sequência.
 * Insere delay entre cada requisição para respeitar a API.
 */
export async function buscarProposicoesPorKeywords(
  keywords: string[],
  dataInicio?: string
): Promise<Proposicao[]> {
  const resultados: Proposicao[] = [];
  const idsSeen = new Set<string>();

  for (const keyword of keywords) {
    const proposicoes = await buscarProposicoesPorKeyword(keyword, dataInicio);

    for (const p of proposicoes) {
      if (!idsSeen.has(p.id)) {
        idsSeen.add(p.id);
        resultados.push(p);
      }
    }

    await sleep(REQUEST_DELAY_MS);
  }

  return resultados;
}

/**
 * Retorna os detalhes completos de uma proposição pelo ID numérico.
 */
export async function buscarDetalheProposicao(
  id: string | number
): Promise<Proposicao | null> {
  try {
    const response = await client.get<{ dados: CamaraFederalProposicaoDetalhes }>(
      `/proposicoes/${id}`
    );
    return normalizarProposicaoFederalDetalhes(response.data.dados);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Retorna o histórico de tramitação de uma proposição.
 */
export async function buscarTramitacoes(
  proposicaoId: string | number
): Promise<Tramitacao[]> {
  try {
    const response = await client.get<{ dados: CamaraFederalTramitacao[] }>(
      `/proposicoes/${proposicaoId}/tramitacoes`,
      { params: { ordem: "DESC", itens: 50 } }
    );

    return response.data.dados.map((t, idx) => ({
      id: `federal-${proposicaoId}-${t.sequencia ?? idx}`,
      proposicaoId: String(proposicaoId),
      sequencia: t.sequencia ?? idx,
      descricao: t.descricaoSituacao + (t.despacho ? ` — ${t.despacho}` : ""),
      orgao: t.siglaOrgao,
      data: t.dataHora,
    }));
  } catch {
    return [];
  }
}

// ─── Votações ────────────────────────────────────────────────────────────────

/**
 * Busca votações recentes do Plenário e comissões.
 *
 * @param dataInicio - Data inicial (AAAA-MM-DD)
 * @param dataFim    - Data final (AAAA-MM-DD)
 */
export async function buscarVotacoes(
  dataInicio: string,
  dataFim: string
): Promise<Votacao[]> {
  try {
    const response = await client.get<{ dados: CamaraFederalVotacao[] }>(
      "/votacoes",
      {
        params: {
          dataInicio,
          dataFim,
          ordem: "DESC",
          ordenarPor: "dataHoraRegistro",
          itens: 50,
        },
      }
    );

    return response.data.dados.map((v) => ({
      id: v.id,
      proposicaoId: null,
      descricao: v.descricao ?? v.proposicaoObjeto ?? "Votação sem descrição",
      orgao: v.siglaOrgao ?? "PLEN",
      dataHora: v.dataHoraRegistro ?? new Date().toISOString(),
      resultado: v.aprovacao != null
        ? v.aprovacao === 1
          ? "Aprovada"
          : "Rejeitada"
        : null,
      uri: v.uri ?? null,
    }));
  } catch {
    return [];
  }
}

// ─── Normalização ─────────────────────────────────────────────────────────────

/** Converte item da listagem da API para o formato interno */
function normalizarProposicaoFederal(
  item: CamaraFederalProposicaoItem,
  keyword: string
): Proposicao {
  const autor =
    item.autores?.[0]?.nome ??
    "Autor não informado";

  return {
    id: String(item.id),
    numero: item.numero,
    ano: item.ano,
    siglaTipo: item.siglaTipo,
    ementa: item.ementa,
    ementaDetalhada: null,
    dataApresentacao: item.dataApresentacao,
    autor,
    casa: "federal",
    urlOriginal: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`,
    status: item.statusProposicao?.descricaoSituacao ?? "Em tramitação",
    orgaoStatus: item.statusProposicao?.siglaOrgao ?? null,
    aiSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    keywords: [{ keyword: { id: keyword, text: keyword } }],
  };
}

/** Converte resposta de detalhe da API para o formato interno */
function normalizarProposicaoFederalDetalhes(
  item: CamaraFederalProposicaoDetalhes
): Proposicao {
  const autor = item.autores?.[0]?.nome ?? "Autor não informado";

  return {
    id: String(item.id),
    numero: item.numero,
    ano: item.ano,
    siglaTipo: item.siglaTipo,
    ementa: item.ementa,
    ementaDetalhada: item.ementaDetalhada ?? null,
    dataApresentacao: item.dataApresentacao,
    autor,
    casa: "federal",
    urlOriginal:
      item.urlInteiroTeor ??
      `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`,
    status: item.statusProposicao?.descricaoSituacao ?? "Em tramitação",
    orgaoStatus: item.statusProposicao?.siglaOrgao ?? null,
    aiSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// Exporta o cliente para uso em testes
export { client as camaraFederalClient };
