/**
 * Página de listagem de proposições.
 * Suporta filtros por keyword, casa legislativa e tipo.
 */

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { ProposicaoCard } from "@/components/ProposicaoCard";
import { BookOpen, Filter } from "lucide-react";
import type { Proposicao } from "@/types";

export const revalidate = 300;

interface SearchParams {
  keyword?: string;
  casa?: string;
  tipo?: string;
  pagina?: string;
}

const PER_PAGE = 12;

async function getProposicoes(filters: SearchParams) {
  const pagina = Math.max(1, parseInt(filters.pagina ?? "1", 10));
  const skip = (pagina - 1) * PER_PAGE;

  const where: Record<string, unknown> = {};

  if (filters.keyword) {
    where.keywords = {
      some: {
        keyword: { text: { contains: filters.keyword } },
      },
    };
  }

  if (filters.casa && (filters.casa === "federal" || filters.casa === "poa")) {
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
  };
}

export default async function ProposicoesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { proposicoes, total, paginas, pagina, keywords, tipos } =
    await getProposicoes(params);

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Proposições"
        subtitle={`${total} proposição${total !== 1 ? "ões" : ""} encontrada${total !== 1 ? "s" : ""}`}
      />

      <div className="flex flex-1">
        {/* Filtros (sidebar direita) */}
        <aside className="w-56 flex-shrink-0 border-r border-slate-800 px-4 py-6 space-y-5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 uppercase tracking-wide">
            <Filter className="w-3.5 h-3.5" />
            Filtros
          </div>

          {/* Casa legislativa */}
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
                  href={buildFilterUrl(params, { casa: value, pagina: undefined })}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    (params.casa ?? "") === value
                      ? "bg-blue-600/15 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>
          </div>

          {/* Por tipo */}
          {tipos.length > 0 && (
            <div>
              <p className="label">Tipo</p>
              <div className="space-y-1.5">
                <a
                  href={buildFilterUrl(params, { tipo: undefined, pagina: undefined })}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    !params.tipo
                      ? "bg-blue-600/15 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Todos
                </a>
                {tipos.map((tipo) => (
                  <a
                    key={tipo}
                    href={buildFilterUrl(params, { tipo, pagina: undefined })}
                    className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                      params.tipo === tipo
                        ? "bg-blue-600/15 text-blue-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                    }`}
                  >
                    {tipo}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Por keyword */}
          {keywords.length > 0 && (
            <div>
              <p className="label">Tema</p>
              <div className="space-y-1.5">
                <a
                  href={buildFilterUrl(params, { keyword: undefined, pagina: undefined })}
                  className={`block text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    !params.keyword
                      ? "bg-blue-600/15 text-blue-400"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                  }`}
                >
                  Todos
                </a>
                {keywords.map((kw) => (
                  <a
                    key={kw.id}
                    href={buildFilterUrl(params, { keyword: kw.text, pagina: undefined })}
                    className={`block text-sm px-3 py-1.5 rounded-lg transition-colors truncate ${
                      params.keyword === kw.text
                        ? "bg-blue-600/15 text-blue-400"
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
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

        {/* Lista de proposições */}
        <div className="flex-1 px-8 py-6">
          {proposicoes.length > 0 ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 stagger">
                {proposicoes.map((p) => (
                  <ProposicaoCard
                    key={p.id}
                    proposicao={p}
                    highlight={params.keyword}
                  />
                ))}
              </div>

              {/* Paginação */}
              {paginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {pagina > 1 && (
                    <a
                      href={buildFilterUrl(params, { pagina: String(pagina - 1) })}
                      className="btn-secondary text-xs"
                    >
                      ← Anterior
                    </a>
                  )}
                  <span className="text-sm text-slate-500">
                    Página {pagina} de {paginas}
                  </span>
                  {pagina < paginas && (
                    <a
                      href={buildFilterUrl(params, { pagina: String(pagina + 1) })}
                      className="btn-secondary text-xs"
                    >
                      Próxima →
                    </a>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <BookOpen className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-slate-400 font-medium">Nenhuma proposição encontrada</p>
              <p className="text-sm text-slate-600 mt-1">
                {params.keyword || params.casa || params.tipo
                  ? "Tente remover os filtros ou adicionar novos temas"
                  : "Execute o monitor para buscar proposições"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Constrói URL de filtro preservando os parâmetros existentes */
function buildFilterUrl(
  current: SearchParams,
  updates: Partial<Record<keyof SearchParams, string | undefined>>
): string {
  const params = new URLSearchParams();
  const merged = { ...current, ...updates };

  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }

  const str = params.toString();
  return str ? `/proposicoes?${str}` : "/proposicoes";
}
