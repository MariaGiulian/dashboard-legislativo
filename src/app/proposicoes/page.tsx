/**
 * Página de Proposições.
 *
 * Dois modos:
 *   - "monitoradas" (padrão): PLs salvos no banco, filtrados por keyword
 *   - "direto": consulta ao vivo na Câmara Federal ou Municipal com filtros
 */

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { ProposicaoCard } from "@/components/ProposicaoCard";
import { ProposicoesDiretoFilters } from "./ProposicoesDiretoFilters";
import { BookOpen, Filter, Wifi, Database, Search, AlertCircle } from "lucide-react";
import { buscarProposicoesLive, buscarPartidos } from "@/lib/api/camara-federal";
import { buscarProposicoesPOAFiltradas } from "@/lib/api/camara-poa";
import type { Proposicao } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

const TIPOS = ["PL","PEC","PLP","PDL","MPV","REQ","INC"];

const ANOS = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() - i);

export interface SearchParams {
  // Modo
  modo?: string;         // "direto" | undefined (monitoradas)
  // Filtros do modo monitoradas
  keyword?: string;
  casa?: string;
  tipo?: string;
  pagina?: string;
  // Filtros do modo direto
  busca?: string;
  casaBusca?: string;
  uf?: string;
  partido?: string;
  tipoD?: string;
  ano?: string;
  deputadoId?: string;
  deputadoNome?: string;
  paginaD?: string;
}

const PER_PAGE = 12;
const PROTOCOLADOS_RECENTES_DIAS = 89;

// ─── Modo monitoradas ────────────────────────────────────────────────────────

async function getProposicoesBanco(filters: SearchParams) {
  const pagina = Math.max(1, parseInt(filters.pagina ?? "1", 10));
  const skip = (pagina - 1) * PER_PAGE;

  const where: Record<string, unknown> = {};

  if (filters.keyword) {
    where.keywords = {
      some: { keyword: { text: { contains: filters.keyword } } },
    };
  }
  if (filters.casa === "federal" || filters.casa === "poa") {
    where.casa = filters.casa;
  }
  if (filters.tipo) {
    where.siglaTipo = filters.tipo;
  }

  const [proposicoes, total, keywords, tipos] = await Promise.all([
    prisma.proposicao.findMany({
      where,
      take: PER_PAGE,
      skip,
      orderBy: { dataApresentacao: "desc" },
      include: {
        keywords: {
          include: { keyword: { select: { id: true, text: true } } },
        },
      },
    }),
    prisma.proposicao.count({ where }),
    prisma.keyword.findMany({
      where: { active: true },
      select: { id: true, text: true },
      orderBy: { text: "asc" },
    }),
    prisma.proposicao.findMany({
      select: { siglaTipo: true },
      distinct: ["siglaTipo"],
      orderBy: { siglaTipo: "asc" },
    }),
  ]);

  return {
    proposicoes: proposicoes as unknown as Proposicao[],
    total,
    paginas: Math.ceil(total / PER_PAGE),
    pagina,
    keywords,
    tipos: tipos.map((t) => t.siglaTipo),
    dbOk: true,
  };
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default async function ProposicoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const isDireto = params.modo === "direto";

  return isDireto
    ? <ProposicoesDiretoPage params={params} />
    : <ProposicoesBancoPage params={params} />;
}

// ─── Modo banco ───────────────────────────────────────────────────────────────

async function ProposicoesBancoPage({ params }: { params: SearchParams }) {
  const { proposicoes, total, paginas, pagina, keywords, tipos, dbOk } =
    await getProposicoesBanco(params).catch(() => ({
      proposicoes: [] as Proposicao[],
      total: 0,
      paginas: 0,
      pagina: 1,
      keywords: [] as { id: string; text: string }[],
      tipos: [] as string[],
      dbOk: false,
    }));

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Proposições"
        subtitle={`${total} proposição${total !== 1 ? "ões" : ""} monitorada${total !== 1 ? "s" : ""}`}
      />

      {/* Barra de modo */}
      <div className="border-b border-gray-200 bg-white px-8 py-2 flex items-center gap-3">
        <span className="badge bg-gray-100 text-gray-600 border-gray-200">
          <Database className="w-3 h-3" />
          Monitoradas
        </span>
        <a
          href="/proposicoes?modo=direto"
          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        >
          <Wifi className="w-3 h-3" />
          Consultar projetos ao vivo →
        </a>
      </div>

      {/* Aviso: banco não configurado */}
      {!dbOk && (
        <div className="mx-8 mt-4 card border-amber-300 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 mb-1">
                Banco de dados não configurado
              </p>
              <p className="text-xs text-amber-700 mb-2">
                As proposições monitoradas precisam do banco. Configure{" "}
                <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code> no{" "}
                <code className="bg-amber-100 px-1 rounded">.env.local</code>, ou use a consulta direta:
              </p>
              <a href="/proposicoes?modo=direto" className="btn-primary text-xs inline-flex">
                <Wifi className="w-3 h-3" />
                Consultar projetos ao vivo
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1">
        {/* Filtros sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 px-4 py-6 space-y-5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </div>

          {/* Casa */}
          <div>
            <p className="label">Casa</p>
            <div className="space-y-1.5">
              {[
                { value: "", label: "Todas" },
                { value: "federal", label: "Câmara Federal" },
                { value: "poa", label: "Câmara POA" },
              ].map(({ value, label }) => (
                <a
                  key={value}
                  href={buildUrl(params, { casa: value, pagina: undefined })}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    (params.casa ?? "") === value
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Tipo */}
          {tipos.length > 0 && (
            <div>
              <p className="label">Tipo</p>
              <div className="space-y-1.5">
                <a
                  href={buildUrl(params, { tipo: undefined, pagina: undefined })}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    !params.tipo
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  Todos
                </a>
                {tipos.map((tipo) => (
                  <a
                    key={tipo}
                    href={buildUrl(params, { tipo, pagina: undefined })}
                    className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      params.tipo === tipo
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    {tipo}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Keyword */}
          {keywords.length > 0 && (
            <div>
              <p className="label">Tema</p>
              <div className="space-y-1.5">
                <a
                  href={buildUrl(params, { keyword: undefined, pagina: undefined })}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    !params.keyword
                      ? "bg-blue-50 text-blue-600 font-medium"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                  }`}
                >
                  Todos
                </a>
                {keywords.map((kw) => (
                  <a
                    key={kw.id}
                    href={buildUrl(params, { keyword: kw.text, pagina: undefined })}
                    className={`block text-sm px-3 py-1.5 rounded-lg transition-colors truncate ${
                      params.keyword === kw.text
                        ? "bg-blue-50 text-blue-600 font-medium"
                        : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                    }`}
                    title={kw.text}
                  >
                    {kw.text}
                  </a>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Lista */}
        <div className="flex-1 px-8 py-6">
          {proposicoes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 stagger">
                {proposicoes.map((p) => (
                  <ProposicaoCard key={p.id} proposicao={p} highlight={params.keyword} />
                ))}
              </div>

              {paginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {pagina > 1 && (
                    <a href={buildUrl(params, { pagina: String(pagina - 1) })} className="btn-secondary text-xs">
                      ← Anterior
                    </a>
                  )}
                  <span className="text-sm text-gray-500">
                    Página {pagina} de {paginas}
                  </span>
                  {pagina < paginas && (
                    <a href={buildUrl(params, { pagina: String(pagina + 1) })} className="btn-secondary text-xs">
                      Próxima →
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma proposição encontrada</p>
              <p className="text-sm text-gray-400 mt-1">
                {params.keyword || params.casa || params.tipo
                  ? "Tente remover os filtros"
                  : "Execute o monitor para buscar proposições, ou use a consulta direta"}
              </p>
              <a href="/proposicoes?modo=direto" className="btn-blue mt-4 text-sm">
                <Wifi className="w-4 h-4" />
                Consultar projetos ao vivo
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modo direto (API ao vivo) ────────────────────────────────────────────────

async function ProposicoesDiretoPage({ params }: { params: SearchParams }) {
  const paginaD = Math.max(1, parseInt(params.paginaD ?? "1", 10));
  const casaBusca = params.casaBusca === "poa" ? "poa" : "federal";
  const paramsBusca = sanitizeDiretoParams(params, casaBusca);
  const buscaFederalSemFiltro = casaBusca === "federal" && !(
    paramsBusca.busca ||
    paramsBusca.uf ||
    paramsBusca.partido ||
    paramsBusca.tipoD ||
    paramsBusca.ano ||
    paramsBusca.deputadoId
  );

  const temFiltro = casaBusca === "poa"
    ? Boolean(paramsBusca.busca || paramsBusca.tipoD || paramsBusca.ano)
    : true;

  let proposicoes: Proposicao[] = [];
  let temProxima = false;
  const partidos = casaBusca === "federal" ? await buscarPartidos() : [];

  if (temFiltro) {
    if (casaBusca === "poa") {
      proposicoes = await buscarProposicoesPOAFiltradas({
        keyword: paramsBusca.busca || undefined,
        tipo: paramsBusca.tipoD || undefined,
        pagina: paginaD,
      });

      if (paramsBusca.ano) {
        const anoFiltro = parseInt(paramsBusca.ano, 10);
        proposicoes = proposicoes.filter((p) => p.ano === anoFiltro);
      }
    } else {
      const periodoProtocolados = buscaFederalSemFiltro
        ? getPeriodoProtocoladosRecentes()
        : null;
      const resultado = await buscarProposicoesLive({
        keywords: paramsBusca.busca || undefined,
        siglaTipo: paramsBusca.tipoD || undefined,
        siglaUfAutor: paramsBusca.uf || undefined,
        siglaPartidoAutor: paramsBusca.partido || undefined,
        idDeputadoAutor: paramsBusca.deputadoId ? parseInt(paramsBusca.deputadoId, 10) : undefined,
        ano: paramsBusca.ano ? parseInt(paramsBusca.ano, 10) : undefined,
        dataInicio: periodoProtocolados?.dataInicio,
        dataFim: periodoProtocolados?.dataFim,
        ordem: periodoProtocolados ? "DESC" : undefined,
        ordenarPor: periodoProtocolados ? "id" : undefined,
        pagina: paginaD,
        itens: 20,
      });
      proposicoes = resultado.dados;
      temProxima = resultado.temProxima;
    }
  }

  return (
    <div className="flex flex-col flex-1">
      <Header
        title={casaBusca === "poa" ? "Consulta à Câmara Municipal" : "Consulta à Câmara Federal"}
        subtitle={
          casaBusca === "poa"
            ? "Busca direta nos projetos da Câmara Municipal de Porto Alegre"
            : buscaFederalSemFiltro
              ? "Projetos protocolados recentemente nos dados abertos da Câmara"
              : "Busca direta nos dados abertos — sem necessidade de configurar temas"
        }
      />

      {/* Barra de modo */}
      <div className="border-b border-gray-200 bg-white px-8 py-2 flex items-center gap-3">
        <span className="badge bg-blue-100 text-blue-700 border-blue-200">
          <Wifi className="w-3 h-3" />
          Consulta ao vivo
        </span>
        <a
          href="/proposicoes"
          className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <Database className="w-3 h-3" />
          ← Ver proposições monitoradas
        </a>
      </div>

      <div className="flex flex-1">
        {/* Filtros */}
        <aside className="w-60 flex-shrink-0 border-r border-gray-200 px-4 py-6 space-y-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5" />
            Filtros de busca
          </div>

          <ProposicoesDiretoFilters
            params={paramsBusca}
            casaBusca={casaBusca}
            partidos={partidos}
            ufs={UFS}
            tipos={TIPOS}
            anos={ANOS}
            showClear={temFiltro && !buscaFederalSemFiltro}
          />
        </aside>

        {/* Resultados */}
        <div className="flex-1 px-8 py-6">
          {!temFiltro ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-600 font-medium">Use os filtros para buscar proposições</p>
              <p className="text-sm text-gray-400 mt-1 max-w-sm">
                Selecione a origem e filtre por palavras-chave, tipo, ano
                {casaBusca === "federal" ? ", partido, estado ou deputado específico." : "."}
              </p>
            </div>
          ) : proposicoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhuma proposição encontrada</p>
              <p className="text-sm text-gray-400 mt-1">
                Tente outros termos ou remova alguns filtros
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">
                  {proposicoes.length} resultado{proposicoes.length !== 1 ? "s" : ""} (página {paginaD})
                  {buscaFederalSemFiltro ? ` — protocolados nos últimos ${PROTOCOLADOS_RECENTES_DIAS} dias` : ""}
                </p>
                <span className="badge bg-blue-100 text-blue-700 border-blue-200">
                  <Wifi className="w-3 h-3" />
                  {casaBusca === "poa" ? "Câmara Municipal de POA" : "API da Câmara Federal"}
                </span>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 stagger">
                {proposicoes.map((p) => (
                  <ProposicaoCard key={p.id} proposicao={p} highlight={paramsBusca.busca} />
                ))}
              </div>

              {/* Paginação */}
              <div className="flex items-center justify-center gap-2 mt-8">
                {paginaD > 1 && (
                  <a
                    href={buildUrlDireto(paramsBusca, { paginaD: String(paginaD - 1) })}
                    className="btn-secondary text-xs"
                  >
                    ← Anterior
                  </a>
                )}
                <span className="text-sm text-gray-500">Página {paginaD}</span>
                {temProxima && (
                  <a
                    href={buildUrlDireto(paramsBusca, { paginaD: String(paginaD + 1) })}
                    className="btn-secondary text-xs"
                  >
                    Próxima →
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUrl(
  current: SearchParams,
  updates: Partial<Record<keyof SearchParams, string | undefined>>
): string {
  const merged = { ...current, ...updates };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v && k !== "modo") p.set(k, v);
  }
  const str = p.toString();
  return str ? `/proposicoes?${str}` : "/proposicoes";
}

function buildUrlDireto(
  current: SearchParams,
  updates: Partial<Record<keyof SearchParams, string | undefined>>
): string {
  const casaBusca =
    updates.casaBusca === "poa"
      ? "poa"
      : updates.casaBusca === "federal"
        ? "federal"
        : current.casaBusca === "poa"
          ? "poa"
          : "federal";
  const merged = sanitizeDiretoParams({ ...current, ...updates }, casaBusca);
  const p = new URLSearchParams();
  p.set("modo", "direto");
  for (const [k, v] of Object.entries(merged)) {
    if (v && k !== "modo") p.set(k, v);
  }
  return `/proposicoes?${p.toString()}`;
}

function sanitizeDiretoParams(params: SearchParams, casaBusca: "federal" | "poa"): SearchParams {
  if (casaBusca === "federal") return { ...params, casaBusca };

  return {
    ...params,
    casaBusca,
    uf: undefined,
    partido: undefined,
    deputadoId: undefined,
    deputadoNome: undefined,
  };
}

function getPeriodoProtocoladosRecentes(): { dataInicio: string; dataFim: string } {
  const dataFim = new Date();
  const dataInicio = new Date(dataFim);
  dataInicio.setDate(dataInicio.getDate() - PROTOCOLADOS_RECENTES_DIAS);

  return {
    dataInicio: formatApiDate(dataInicio),
    dataFim: formatApiDate(dataFim),
  };
}

function formatApiDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
