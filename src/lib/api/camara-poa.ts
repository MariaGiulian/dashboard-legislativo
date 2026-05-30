/**
 * Scraper para a Câmara Municipal de Porto Alegre
 *
 * Site oficial: https://www.camarapoa.rs.gov.br
 * A Câmara Municipal de POA não disponibiliza uma API REST pública documentada.
 * Este módulo faz web scraping das páginas de busca de proposições.
 *
 * ATENÇÃO: Scrapers são frágeis a mudanças de layout.
 * Se as buscas pararem de funcionar, inspecione:
 *   https://www.camarapoa.rs.gov.br/processos
 * e atualize os seletores CSS abaixo.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import { type CamaraPOAProposicao, type Proposicao, type VereadorPOA } from "@/types";
import { generatePoaId, getDefaultHeaders, sleep } from "@/lib/utils";

const BASE_URL = "https://www.camarapoa.rs.gov.br";
const SEARCH_URL = `${BASE_URL}/projetos`;
const REQUEST_DELAY_MS = 1000; // mais conservador por ser scraping

const client = axios.create({
  timeout: 20_000,
  headers: {
    ...getDefaultHeaders(),
    // Simula um navegador para não ser bloqueado
    "User-Agent":
      "Mozilla/5.0 (compatible; LegislaMonitor/1.0; +https://github.com/seu-usuario/legisla-monitor)",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pt-BR,pt;q=0.9",
  },
});

export interface BuscarProposicoesPOAParams {
  keyword?: string;
  tipo?: string;
  autor?: string;
  andamento?: "todos" | "em_tramitacao" | "aprovados_em";
  aprovadosEm?: number;
  pagina?: number;
}

// ─── Interface pública ────────────────────────────────────────────────────────

/**
 * Busca proposições da Câmara Municipal de POA por palavra-chave.
 *
 * Tenta os endpoints em ordem. Se o site mudar e todos falharem,
 * retorna array vazio e loga o erro para que possa ser corrigido.
 *
 * @param keyword - Termo de busca
 * @returns Lista de proposições normalizadas
 */
export async function buscarProposicoesPOA(keyword: string): Promise<Proposicao[]> {
  try {
    const raw = await scrapeSearchResults({ keyword });
    return raw.map(normalizarProposicaoPOA);
  } catch (error) {
    // Falha silenciosa com log — scraping pode quebrar sem aviso
    console.warn(
      `[CâmaraPOA] Busca por "${keyword}" falhou:`,
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Busca proposições da Câmara Municipal de POA usando os filtros do formulário
 * oficial de /processos.
 */
export async function buscarProposicoesPOAFiltradas(
  params: BuscarProposicoesPOAParams
): Promise<Proposicao[]> {
  try {
    const raw = await scrapeSearchResults(params);
    return raw.map(normalizarProposicaoPOA);
  } catch (error) {
    console.warn(
      "[CâmaraPOA] Busca filtrada falhou:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

/**
 * Busca proposições para múltiplas keywords.
 */
export async function buscarProposicoesPOAPorKeywords(
  keywords: string[]
): Promise<Proposicao[]> {
  const resultados: Proposicao[] = [];
  const idsSeen = new Set<string>();

  for (const keyword of keywords) {
    const proposicoes = await buscarProposicoesPOA(keyword);

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
 * Lista vereadores da Câmara Municipal de Porto Alegre.
 */
export async function buscarVereadoresPOA(): Promise<VereadorPOA[]> {
  try {
    const response = await client.get(`${BASE_URL}/vereadores`);
    return parseVereadoresPage(response.data);
  } catch (error) {
    console.warn(
      "[CâmaraPOA] Lista de vereadores falhou:",
      error instanceof Error ? error.message : error
    );
    return [];
  }
}

// ─── Scraping ─────────────────────────────────────────────────────────────────

/** Acessa a página de busca e extrai os resultados */
async function scrapeSearchResults(
  filtros: BuscarProposicoesPOAParams
): Promise<CamaraPOAProposicao[]> {
  const response = await client.get(SEARCH_URL, {
    headers: {
      Accept: "text/javascript, application/javascript, */*;q=0.8",
      "X-Requested-With": "XMLHttpRequest",
    },
    params: {
      busca: filtros.keyword || undefined,
      tipo: filtros.tipo || undefined,
      autor: filtros.autor || undefined,
      andamento: filtros.andamento ?? "todos",
      aprovados_em: filtros.aprovadosEm,
      page: filtros.pagina && filtros.pagina > 1 ? filtros.pagina : undefined,
    },
  });

  return parseSearchPage(response.data);
}

/**
 * Parseia o HTML da página de resultados usando seletores Cheerio.
 *
 * Estrutura esperada (inspecionada em 2024-2025):
 *   <table class="table"> ou <ul class="lista-proposicoes">
 *     <tr> ou <li> com dados de cada proposição
 *
 * Seletores alternativos são tentados em sequência para robustez.
 */
function parseSearchPage(responseBody: string): CamaraPOAProposicao[] {
  const html = extractHtmlFromAjaxResponse(responseBody);
  const $ = cheerio.load(html);
  const resultados: CamaraPOAProposicao[] = [];

  $(".lista section.ui.items article.item, .lista article.item").each((_, el) => {
    const linkEl = $(el).find("h2.header a, h2.ui.header a").first();
    const titulo = normalizeSpaces(linkEl.text());
    const link = linkEl.attr("href") ?? "";
    const ementa = normalizeSpaces($(el).find(".description p").first().text());
    const autor = extrairCampoListagem($, el, "Autor") || "Não informado";
    const status = extrairCampoListagem($, el, "Situação") || "Em tramitação";
    const tramitacaoIso = $(el).find("time").first().attr("datetime");
    const parsed = parseTituloProcesso(titulo);

    if (!parsed || !ementa) return;

    resultados.push({
      id: generatePoaId(parsed.siglaTipo, parsed.numero, parsed.ano),
      numero: parsed.numero,
      ano: parsed.ano,
      siglaTipo: parsed.siglaTipo,
      ementa,
      autor,
      status,
      dataApresentacao: tramitacaoIso
        ? new Date(tramitacaoIso).toISOString()
        : new Date().toISOString(),
      urlOriginal: normalizeUrl(link),
    });
  });

  if (resultados.length > 0) return resultados;

  // Tenta seletor de tabela (layout mais comum)
  const rows = $("table.table tbody tr, .resultado-proposicoes tr").toArray();

  if (rows.length > 0) {
    rows.forEach((row) => {
      const cells = $(row).find("td");
      if (cells.length < 3) return;

      const tipo = $(cells[0]).text().trim();
      const numeroAno = $(cells[1]).text().trim(); // ex: "001/2025"
      const ementa = $(cells[2]).text().trim();
      const link = $(row).find("a").first().attr("href") ?? "";

      const { numero, ano } = parseNumeroAno(numeroAno);
      if (!numero || !ano) return;

      resultados.push({
        id: generatePoaId(tipo || "PROP", numero, ano),
        numero,
        ano,
        siglaTipo: tipo || "PROP",
        ementa: ementa || "Ementa não disponível",
        autor: extrairAutor($, row),
        status: extrairStatus($, row),
        dataApresentacao: extrairData($, row),
        urlOriginal: link.startsWith("http") ? link : `${BASE_URL}${link}`,
      });
    });

    return resultados;
  }

  // Fallback: tenta lista em formato de cards
  $(".card-proposicao, .item-proposicao").each((_, el) => {
    const tipo = $(el).find(".tipo, .badge").first().text().trim();
    const ementa = $(el).find(".ementa, p").first().text().trim();
    const link = $(el).find("a").first().attr("href") ?? "";
    const dataText = $(el).find(".data, time").first().text().trim();

    const numero = parseInt($(el).find(".numero").first().text(), 10);
    const ano = new Date().getFullYear();

    if (!ementa || isNaN(numero)) return;

    resultados.push({
      id: generatePoaId(tipo || "PROP", numero, ano),
      numero,
      ano,
      siglaTipo: tipo || "PROP",
      ementa,
      autor: $(el).find(".autor").first().text().trim() || "Não informado",
      status: $(el).find(".status, .situacao").first().text().trim() || "Em tramitação",
      dataApresentacao: parseDataBR(dataText) || new Date().toISOString(),
      urlOriginal: normalizeUrl(link),
    });
  });

  return resultados;
}

function parseVereadoresPage(responseBody: string): VereadorPOA[] {
  const $ = cheerio.load(responseBody);
  const vereadores: VereadorPOA[] = [];
  const vistos = new Set<string>();

  $("a[href*='/vereadores/']").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const url = normalizeUrl(href);
    const slug = url.split("/vereadores/")[1]?.split(/[?#]/)[0];
    if (!slug || vistos.has(slug)) return;

    const container = $(el).closest("article, .card, .item, li, div");
    const rawText = normalizeSpaces($(el).text() || container.text());
    const nomePartido = parseNomePartido(rawText);
    if (!nomePartido) return;

    const foto =
      container.find("img").first().attr("src") ||
      $(el).find("img").first().attr("src") ||
      null;

    vistos.add(slug);
    vereadores.push({
      id: slug,
      nome: nomePartido.nome,
      partido: nomePartido.partido,
      url,
      fotoUrl: foto ? normalizeUrl(foto) : null,
      situacao: rawText.toLowerCase().includes("substituindo") ? "Substituto" : null,
    });
  });

  return vereadores.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

function parseNomePartido(texto: string): { nome: string; partido: string } | null {
  const match = texto.match(/^(.+?)\s*\(([A-Z0-9]+)\)/);
  if (!match) return null;

  const nome = normalizeSpaces(match[1]);
  const partido = match[2];
  if (!nome || nome.length < 3) return null;

  return { nome, partido };
}

// ─── Helpers de parsing ───────────────────────────────────────────────────────

function parseNumeroAno(texto: string): { numero: number; ano: number } {
  const match = texto.match(/(\d+)[\/\-](\d{4})/);
  if (!match) return { numero: 0, ano: 0 };
  return { numero: parseInt(match[1], 10), ano: parseInt(match[2], 10) };
}

function parseTituloProcesso(
  titulo: string
): { numero: number; ano: number; siglaTipo: string } | null {
  const tipoMatch = titulo.match(/-\s*([A-Z]{2,5})(?:\s+(\d+)\s*\/\s*(\d{2,4}))?/);
  const procMatch = titulo.match(/PROC\.\s*(?:N[º°]\s*)?(\d+)\s*\/\s*(\d{2,4})/i);

  if (!tipoMatch && !procMatch) return null;

  const siglaTipo = tipoMatch?.[1] ?? "PROC";
  const numero = parseInt(tipoMatch?.[2] ?? procMatch?.[1] ?? "0", 10);
  const ano = expandAno(tipoMatch?.[3] ?? procMatch?.[2] ?? "");

  if (!numero || !ano) return null;
  return { numero, ano, siglaTipo };
}

function expandAno(ano: string): number {
  const parsed = parseInt(ano, 10);
  if (!parsed) return 0;
  if (ano.length === 2) return parsed >= 90 ? 1900 + parsed : 2000 + parsed;
  return parsed;
}

function extrairCampoListagem(
  $: cheerio.CheerioAPI,
  el: Element,
  label: string
): string {
  let valor = "";

  $(el).find(".meta .ui.list .item").each((_, item) => {
    const header = normalizeSpaces($(item).find(".header").first().text());
    if (header.toLowerCase() !== label.toLowerCase()) return;

    const clone = $(item).clone();
    clone.find(".header").remove();
    valor = normalizeSpaces(clone.text());
  });

  return valor;
}

function extractHtmlFromAjaxResponse(body: string): string {
  const match = body.match(/replaceWith\('([\s\S]*)'\);\s*\$\(document\)/);
  if (!match) return body;

  return match[1]
    .replace(/\\n/g, "\n")
    .replace(/\\"/g, "\"")
    .replace(/\\\//g, "/")
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

function normalizeSpaces(texto: string): string {
  return texto.replace(/\s+/g, " ").trim();
}

function normalizeUrl(url: string): string {
  if (!url) return BASE_URL;
  return url.startsWith("http") ? url : `${BASE_URL}${url}`;
}

function extrairAutor($: cheerio.CheerioAPI, row: Element): string {
  const texto = $(row).find(".autor, td:nth-child(4)").first().text().trim();
  return texto || "Não informado";
}

function extrairStatus($: cheerio.CheerioAPI, row: Element): string {
  const texto = $(row).find(".status, .situacao, td:last-child").first().text().trim();
  return texto || "Em tramitação";
}

function extrairData($: cheerio.CheerioAPI, row: Element): string {
  const texto = $(row).find(".data, time, td:nth-child(3)").first().text().trim();
  return parseDataBR(texto) || new Date().toISOString();
}

/** Converte data no formato DD/MM/AAAA para ISO string */
function parseDataBR(texto: string): string | null {
  const match = texto.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) return null;
  const [, dia, mes, ano] = match;
  return new Date(`${ano}-${mes}-${dia}T00:00:00.000Z`).toISOString();
}

// ─── Normalização ─────────────────────────────────────────────────────────────

/** Converte proposição do POA para o formato interno da aplicação */
function normalizarProposicaoPOA(item: CamaraPOAProposicao): Proposicao {
  return {
    id: item.id,
    numero: item.numero,
    ano: item.ano,
    siglaTipo: item.siglaTipo,
    ementa: item.ementa,
    ementaDetalhada: null,
    dataApresentacao: item.dataApresentacao,
    autor: item.autor,
    casa: "poa",
    urlOriginal: item.urlOriginal,
    status: item.status,
    orgaoStatus: null,
    aiSummary: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
