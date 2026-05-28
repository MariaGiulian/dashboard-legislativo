/**
 * Cliente para a API de Dados Abertos da Câmara dos Deputados
 *
 * Documentação: https://dadosabertos.camara.leg.br/swagger/api.html
 * Base URL: https://dadosabertos.camara.leg.br/api/v2
 * Sem autenticação — API pública.
 *
 * CORREÇÕES aplicadas em relação à versão anterior:
 *  - Removido `ordenarPor=dataApresentacao` (parâmetro inválido → HTTP 400)
 *  - Removido `itens` e `ordem` de tramitações (não suportados → HTTP 400)
 *  - `autores` não existe na listagem; buscados via /proposicoes/{id}/autores
 *  - `descricaoSituacao` ≠ descrição da tramitação; campo correto: `descricaoTramitacao`
 *  - Incluídos campos ricos: despacho, regime, apreciacao, urlDocumento, keywordsApi
 */

import axios, { type AxiosInstance } from "axios";
import {
  type CamaraFederalProposicaoItem,
  type CamaraFederalProposicaoDetalhes,
  type CamaraFederalTramitacaoItem,
  type CamaraFederalVotacaoItem,
  type CamaraFederalAutor,
  type CamaraFederalTema,
  type CamaraFederalEnvelope,
  type Proposicao,
  type Tramitacao,
  type Votacao,
  type Deputado,
  type Partido,
  type VotoDeputado,
  type ResumoPlacar,
} from "@/types";
import { sleep, getDefaultHeaders } from "@/lib/utils";

const BASE_URL = "https://dadosabertos.camara.leg.br/api/v2";

/** Delay entre requisições — respeito à API pública */
const DELAY_MS = 400;

const client: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 20_000,
  headers: getDefaultHeaders(),
});

// =============================================================================
// PROPOSIÇÕES
// =============================================================================

/**
 * Busca proposições por palavra-chave na ementa.
 *
 * Parâmetros válidos confirmados na API:
 *   - keywords, dataInicio, dataFim, siglaTipo, numero, ano, autor, pagina
 *
 * REMOVIDO: ordenarPor=dataApresentacao (inválido — causa HTTP 400)
 */
export async function buscarProposicoesPorKeyword(
  keyword: string,
  dataInicio?: string,
  pagina = 1,
  itensPorPagina = 20
): Promise<Proposicao[]> {
  const params: Record<string, string | number> = {
    keywords: keyword,
    pagina,
    itens: itensPorPagina,
  };

  if (dataInicio) {
    // Filtro por data de apresentação (formato AAAA-MM-DD)
    params.dataInicio = dataInicio;
  }

  try {
    const response = await client.get<CamaraFederalEnvelope<CamaraFederalProposicaoItem[]>>(
      "/proposicoes",
      { params }
    );

    const itens = response.data.dados ?? [];
    return itens.map((item) => normalizarItemListagem(item));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return [];
    throw new Error(
      `[CamaraFederal] buscarProposicoesPorKeyword("${keyword}"): ` +
      (error instanceof Error ? error.message : String(error))
    );
  }
}

/**
 * Busca proposições para múltiplas keywords, deduplicando por ID.
 * Insere delay entre chamadas para não sobrecarregar a API.
 */
export async function buscarProposicoesPorKeywords(
  keywords: string[],
  dataInicio?: string
): Promise<Proposicao[]> {
  const resultado: Proposicao[] = [];
  const idsSeen = new Set<string>();

  for (const kw of keywords) {
    const items = await buscarProposicoesPorKeyword(kw, dataInicio);
    for (const p of items) {
      if (!idsSeen.has(p.id)) {
        idsSeen.add(p.id);
        resultado.push(p);
      }
    }
    await sleep(DELAY_MS);
  }

  return resultado;
}

/**
 * Busca proposições pelo código de tema oficial da Câmara Federal.
 * Use `listarTemas()` para obter os códigos disponíveis.
 *
 * Ex: codTema=62 → "Ciência, Tecnologia e Inovação"
 */
export async function buscarProposicoesPorTema(
  codTema: string | number,
  dataInicio?: string,
  pagina = 1
): Promise<Proposicao[]> {
  const params: Record<string, string | number> = {
    codTema: String(codTema),
    pagina,
    itens: 20,
  };

  if (dataInicio) params.dataInicio = dataInicio;

  try {
    const response = await client.get<CamaraFederalEnvelope<CamaraFederalProposicaoItem[]>>(
      "/proposicoes",
      { params }
    );
    return (response.data.dados ?? []).map((item) => normalizarItemListagem(item));
  } catch {
    return [];
  }
}

/**
 * Retorna os detalhes completos de uma proposição.
 * Inclui todos os campos ricos que a listagem não retorna:
 * ementaDetalhada, keywords, regime, apreciacao, despacho, urlInteiroTeor, etc.
 */
export async function buscarDetalheProposicao(
  id: string | number
): Promise<Proposicao | null> {
  try {
    const [detalheRes, autoresRes] = await Promise.allSettled([
      client.get<CamaraFederalEnvelope<CamaraFederalProposicaoDetalhes>>(`/proposicoes/${id}`),
      client.get<CamaraFederalEnvelope<CamaraFederalAutor[]>>(`/proposicoes/${id}/autores`),
    ]);

    if (detalheRes.status === "rejected") return null;

    const detalhe = detalheRes.value.data.dados;
    const autores = autoresRes.status === "fulfilled"
      ? autoresRes.value.data.dados ?? []
      : [];

    return normalizarDetalhes(detalhe, autores);
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

/**
 * Busca os autores de uma proposição.
 * A listagem /proposicoes NÃO inclui autores — é preciso chamar este endpoint.
 */
export async function buscarAutoresProposicao(
  proposicaoId: string | number
): Promise<CamaraFederalAutor[]> {
  try {
    const response = await client.get<CamaraFederalEnvelope<CamaraFederalAutor[]>>(
      `/proposicoes/${proposicaoId}/autores`
    );
    return response.data.dados ?? [];
  } catch {
    return [];
  }
}

// =============================================================================
// TRAMITAÇÕES
// =============================================================================

/**
 * Retorna o histórico completo de tramitação de uma proposição.
 *
 * CORREÇÃO: removidos parâmetros `itens` e `ordem` (não suportados, causam 400).
 * A API retorna todas as tramitações ordenadas por sequência por padrão.
 *
 * Campos capturados:
 *   - descricaoTramitacao: a ação que ocorreu (ex: "Apresentação de Proposição")
 *   - descricaoSituacao: status resultante (ex: "Aguardando Designação de Relator")
 *   - despacho: texto completo do despacho — pode conter informações importantes
 *   - regime: regime de tramitação naquele momento
 *   - url: link para o documento gerado naquela etapa
 */
export async function buscarTramitacoes(
  proposicaoId: string | number
): Promise<Tramitacao[]> {
  try {
    const response = await client.get<CamaraFederalEnvelope<CamaraFederalTramitacaoItem[]>>(
      `/proposicoes/${proposicaoId}/tramitacoes`
      // IMPORTANTE: não passar `itens` nem `ordem` — esses parâmetros causam HTTP 400
    );

    const dados = response.data.dados ?? [];

    // Ordena decrescente por sequência (mais recente primeiro) sem depender de parâmetro da API
    return dados
      .sort((a, b) => b.sequencia - a.sequencia)
      .map((t) => normalizarTramitacao(t, String(proposicaoId)));
  } catch {
    return [];
  }
}

// =============================================================================
// VOTAÇÕES
// =============================================================================

/**
 * Busca votações num intervalo de datas.
 * Parâmetros validados: dataInicio, dataFim, itens, pagina, siglaOrgao
 */
export async function buscarVotacoes(
  dataInicio: string,
  dataFim: string,
  siglaOrgao?: string
): Promise<Votacao[]> {
  const params: Record<string, string | number> = {
    dataInicio,
    dataFim,
    itens: 100,
    pagina: 1,
  };

  if (siglaOrgao) params.siglaOrgao = siglaOrgao;

  try {
    const response = await client.get<CamaraFederalEnvelope<CamaraFederalVotacaoItem[]>>(
      "/votacoes",
      { params }
    );

    return (response.data.dados ?? []).map(normalizarVotacao);
  } catch {
    return [];
  }
}

// =============================================================================
// REFERÊNCIAS
// =============================================================================

/**
 * Retorna todos os temas oficiais disponíveis para filtrar proposições.
 * Esses códigos podem ser usados em buscarProposicoesPorTema().
 *
 * Exemplos: 62 = "Ciência, Tecnologia e Inovação", 48 = "Meio Ambiente"
 */
export async function listarTemas(): Promise<CamaraFederalTema[]> {
  try {
    const response = await client.get<CamaraFederalEnvelope<CamaraFederalTema[]>>(
      "/referencias/proposicoes/codTema"
    );
    return response.data.dados ?? [];
  } catch {
    return [];
  }
}

// =============================================================================
// NORMALIZAÇÃO — conversão dos dados brutos da API para o formato interno
// =============================================================================

/**
 * Normaliza um item da listagem /proposicoes.
 *
 * ATENÇÃO: a listagem retorna campos mínimos. Autores e status NÃO estão incluídos.
 * Para dados completos, use buscarDetalheProposicao().
 */
function normalizarItemListagem(item: CamaraFederalProposicaoItem): Proposicao {
  return {
    id: String(item.id),
    numero: item.numero,
    ano: item.ano,
    siglaTipo: item.siglaTipo,
    descricaoTipo: null,    // não disponível na listagem
    ementa: item.ementa,
    ementaDetalhada: null,
    keywordsApi: null,
    dataApresentacao: item.dataApresentacao,
    autor: "Não informado", // autores não estão na listagem — buscar separadamente
    autorUri: null,
    casa: "federal",
    urlOriginal: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`,
    status: "Consultando…", // status real requer chamada ao /proposicoes/{id}
    orgaoStatus: null,
    regime: null,
    apreciacao: null,
    codSituacao: null,
    aiSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Normaliza a resposta detalhada de /proposicoes/{id}.
 * Inclui todos os campos ricos disponíveis na API.
 */
function normalizarDetalhes(
  item: CamaraFederalProposicaoDetalhes,
  autores: CamaraFederalAutor[]
): Proposicao {
  const autorPrincipal = autores.find((a) => a.proponente === 1) ?? autores[0];
  const status = item.statusProposicao;

  return {
    id: String(item.id),
    numero: item.numero,
    ano: item.ano,
    siglaTipo: item.siglaTipo,
    descricaoTipo: item.descricaoTipo || null,
    ementa: item.ementa,
    ementaDetalhada: item.ementaDetalhada || null,
    keywordsApi: item.keywords || null,
    dataApresentacao: item.dataApresentacao,
    autor: autorPrincipal?.nome ?? "Não informado",
    autorUri: autorPrincipal?.uri ?? null,
    casa: "federal",
    urlOriginal:
      item.urlInteiroTeor ??
      `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`,
    status: status?.descricaoSituacao ?? "Status não disponível",
    orgaoStatus: status?.siglaOrgao ?? null,
    regime: status?.regime ?? null,
    apreciacao: status?.apreciacao ?? null,
    codSituacao: status?.codSituacao ?? null,
    aiSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Normaliza um item de tramitação.
 *
 * CORREÇÃO: o campo da ação é `descricaoTramitacao`, não `descricaoSituacao`.
 * `descricaoSituacao` representa o status resultante daquela etapa.
 */
function normalizarTramitacao(
  t: CamaraFederalTramitacaoItem,
  proposicaoId: string
): Tramitacao {
  return {
    id: `federal-${proposicaoId}-${t.sequencia}`,
    proposicaoId,
    sequencia: t.sequencia,
    descricaoTramitacao: t.descricaoTramitacao,
    descricaoSituacao: t.descricaoSituacao,
    despacho: t.despacho || null,
    orgao: t.siglaOrgao,
    regime: t.regime || null,
    urlDocumento: t.url || null,
    data: t.dataHora,
  };
}

/** Normaliza uma votação */
function normalizarVotacao(v: CamaraFederalVotacaoItem): Votacao {
  return {
    id: v.id,
    proposicaoId: null,
    descricao: v.descricao || v.proposicaoObjeto || "Votação sem descrição",
    orgao: v.siglaOrgao,
    dataHora: v.dataHoraRegistro || v.data,
    resultado:
      v.aprovacao === 1 ? "Aprovada" :
      v.aprovacao === 0 ? "Rejeitada" :
      null,
    uri: v.uri ?? null,
  };
}

// =============================================================================
// DEPUTADOS
// =============================================================================

/**
 * Lista deputados federais com filtros opcionais.
 * Retorna até `itens` deputados por página (máx. 100).
 */
export async function buscarDeputados(params: {
  siglaUf?: string;
  siglaPartido?: string;
  nome?: string;
  pagina?: number;
  itens?: number;
}): Promise<{ dados: Deputado[]; totalPaginas: number }> {
  const queryParams: Record<string, string | number> = {
    pagina: params.pagina ?? 1,
    itens: params.itens ?? 100,
    ordem: "ASC",
    ordenarPor: "nome",
  };

  if (params.siglaUf) queryParams.siglaUf = params.siglaUf;
  if (params.siglaPartido) queryParams.siglaPartido = params.siglaPartido;
  if (params.nome) queryParams.nome = params.nome;

  try {
    const response = await client.get<CamaraFederalEnvelope<Deputado[]>>(
      "/deputados",
      { params: queryParams }
    );

    const links = response.data.links ?? [];
    const lastLink = links.find((l) => l.rel === "last");
    let totalPaginas = params.pagina ?? 1;
    if (lastLink?.href) {
      const m = lastLink.href.match(/pagina=(\d+)/);
      if (m) totalPaginas = parseInt(m[1], 10);
    }

    return { dados: response.data.dados ?? [], totalPaginas };
  } catch {
    return { dados: [], totalPaginas: 1 };
  }
}

/**
 * Lista todos os partidos com representação na Câmara Federal.
 */
export async function buscarPartidos(): Promise<Partido[]> {
  try {
    const response = await client.get<CamaraFederalEnvelope<Partido[]>>(
      "/partidos",
      { params: { itens: 100, ordem: "ASC", ordenarPor: "sigla" } }
    );
    return response.data.dados ?? [];
  } catch {
    return [];
  }
}

// =============================================================================
// BUSCA DIRETA (SEM SALVAR NO BANCO)
// =============================================================================

/**
 * Busca proposições diretamente na API da Câmara com filtros avançados.
 * Não persiste no banco — usado para consultas ao vivo.
 */
export async function buscarProposicoesLive(params: {
  keywords?: string;
  siglaTipo?: string;
  siglaUfAutor?: string;
  siglaPartidoAutor?: string;
  idDeputadoAutor?: number;
  ano?: number;
  dataInicio?: string;
  pagina?: number;
  itens?: number;
}): Promise<{ dados: Proposicao[]; temProxima: boolean }> {
  const queryParams: Record<string, string | number> = {
    pagina: params.pagina ?? 1,
    itens: params.itens ?? 20,
  };

  if (params.keywords) queryParams.keywords = params.keywords;
  if (params.siglaTipo) queryParams.siglaTipo = params.siglaTipo;
  if (params.siglaUfAutor) queryParams.siglaUfAutor = params.siglaUfAutor;
  if (params.siglaPartidoAutor) queryParams.siglaPartidoAutor = params.siglaPartidoAutor;
  if (params.idDeputadoAutor) queryParams.idDeputadoAutor = params.idDeputadoAutor;
  if (params.ano) queryParams.ano = params.ano;
  if (params.dataInicio) queryParams.dataInicio = params.dataInicio;

  try {
    const response = await client.get<CamaraFederalEnvelope<CamaraFederalProposicaoItem[]>>(
      "/proposicoes",
      { params: queryParams }
    );

    const links = response.data.links ?? [];
    const temProxima = links.some((l) => l.rel === "next");
    const dados = (response.data.dados ?? []).map((item) => normalizarItemListagem(item));

    return { dados, temProxima };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return { dados: [], temProxima: false };
    }
    throw new Error(
      `[CamaraFederal] buscarProposicoesLive: ` +
      (error instanceof Error ? error.message : String(error))
    );
  }
}

// =============================================================================
// VOTAÇÕES — ANÁLISE DE VOTOS
// =============================================================================

/**
 * Busca o registro individual de votos de uma votação específica.
 * Retorna a lista de deputados e como cada um votou.
 */
export async function buscarVotosDeVotacao(votacaoId: string): Promise<VotoDeputado[]> {
  try {
    const response = await client.get<CamaraFederalEnvelope<VotoDeputado[]>>(
      `/votacoes/${votacaoId}/votos`
    );
    return response.data.dados ?? [];
  } catch {
    return [];
  }
}

/**
 * Calcula o placar consolidado a partir dos votos individuais.
 */
export function calcularPlacar(votos: VotoDeputado[]): ResumoPlacar {
  const placar: ResumoPlacar = { sim: 0, nao: 0, abstencao: 0, obstrucao: 0, total: votos.length };
  for (const v of votos) {
    const tipo = v.tipoVoto.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    if (tipo === "sim") placar.sim++;
    else if (tipo === "nao" || tipo === "não") placar.nao++;
    else if (tipo.includes("absten")) placar.abstencao++;
    else if (tipo.includes("obstru")) placar.obstrucao++;
  }
  return placar;
}

export { client as camaraFederalClient };
