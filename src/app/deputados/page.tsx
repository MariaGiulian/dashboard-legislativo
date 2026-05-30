/**
 * Página de Deputados Federais
 * Consulta direta à API de Dados Abertos da Câmara dos Deputados.
 * Filtros: estado (UF), partido, nome.
 */

import { Header } from "@/components/layout/Header";
import { buscarDeputados, buscarPartidos } from "@/lib/api/camara-federal";
import { Users, Search, BookOpen } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { Deputado } from "@/types";

// Página sempre consulta dados frescos da API
export const revalidate = 3600; // 1 hora

const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO",
  "MA","MT","MS","MG","PA","PB","PR","PE","PI",
  "RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

interface SearchParams {
  uf?: string;
  partido?: string;
  nome?: string;
  pagina?: string;
}

export default async function DeputadosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const pagina = Math.max(1, parseInt(params.pagina ?? "1", 10));

  const [{ dados: deputados, totalPaginas }, partidos] = await Promise.all([
    buscarDeputados({
      siglaUf: params.uf || undefined,
      siglaPartido: params.partido || undefined,
      nome: params.nome || undefined,
      pagina,
      itens: 100,
    }),
    buscarPartidos(),
  ]);

  const totalDeputados = deputados.length;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Deputados Federais"
        subtitle={
          totalDeputados > 0
            ? `${totalDeputados} deputado${totalDeputados !== 1 ? "s" : ""} encontrado${totalDeputados !== 1 ? "s" : ""} — Câmara Federal`
            : "Câmara Federal — 57ª Legislatura (2023–2027)"
        }
      />

      <div className="flex flex-1">
        {/* Filtros */}
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 px-4 py-6 space-y-5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <Search className="w-3.5 h-3.5" />
            Filtros
          </div>

          <form method="GET" action="/deputados" className="space-y-4">
            {/* Busca por nome */}
            <div>
              <label className="label">Nome</label>
              <input
                type="text"
                name="nome"
                defaultValue={params.nome ?? ""}
                placeholder="Ex: Lula, Maria..."
                className="input text-sm"
              />
            </div>

            {/* Estado (UF) */}
            <div>
              <label className="label">Estado</label>
              <select
                name="uf"
                defaultValue={params.uf ?? ""}
                className="input text-sm"
              >
                <option value="">Todos os estados</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            {/* Partido */}
            <div>
              <label className="label">Partido</label>
              <select
                name="partido"
                defaultValue={params.partido ?? ""}
                className="input text-sm"
              >
                <option value="">Todos os partidos</option>
                {partidos.map((p) => (
                  <option key={p.id} value={p.sigla}>
                    {p.sigla}
                  </option>
                ))}
              </select>
            </div>

            <input type="hidden" name="pagina" value="1" />

            <button type="submit" className="btn-primary w-full justify-center">
              <Search className="w-4 h-4" />
              Filtrar
            </button>

            {(params.uf || params.partido || params.nome) && (
              <a
                href="/deputados"
                className="btn-secondary w-full justify-center text-xs"
              >
                Limpar filtros
              </a>
            )}
          </form>

          {/* Filtros ativos */}
          {(params.uf || params.partido || params.nome) && (
            <div className="pt-2 border-t border-gray-100 space-y-1.5">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Filtros ativos
              </p>
              {params.uf && (
                <span className="badge bg-blue-100 text-blue-700 border-blue-200">
                  UF: {params.uf}
                </span>
              )}
              {params.partido && (
                <span className="badge bg-green-100 text-green-700 border-green-200">
                  {params.partido}
                </span>
              )}
              {params.nome && (
                <span className="badge bg-gray-100 text-gray-600 border-gray-200">
                  "{params.nome}"
                </span>
              )}
            </div>
          )}
        </aside>

        {/* Lista de deputados */}
        <div className="flex-1 px-8 py-6">
          {deputados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum deputado encontrado</p>
              <p className="text-sm text-gray-400 mt-1">
                Tente remover ou ajustar os filtros
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
                {deputados.map((dep) => (
                  <DeputadoCard key={dep.id} deputado={dep} />
                ))}
              </div>

              {/* Paginação */}
              {totalPaginas > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {pagina > 1 && (
                    <a
                      href={buildUrl(params, { pagina: String(pagina - 1) })}
                      className="btn-secondary text-xs"
                    >
                      ← Anterior
                    </a>
                  )}
                  <span className="text-sm text-gray-500">
                    Página {pagina} de {totalPaginas}
                  </span>
                  {pagina < totalPaginas && (
                    <a
                      href={buildUrl(params, { pagina: String(pagina + 1) })}
                      className="btn-secondary text-xs"
                    >
                      Próxima →
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DeputadoCard({ deputado }: { deputado: Deputado }) {
  const { id, nome, siglaPartido, siglaUf, urlFoto } = deputado;
  const iniciais = nome
    .split(" ")
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="card flex flex-col items-center text-center gap-3 py-5 animate-fade-in hover:border-green-300 hover:shadow-md transition-all cursor-default">
      {/* Foto */}
      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
        {urlFoto ? (
          <Image
            src={urlFoto}
            alt={nome}
            fill
            sizes="64px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-gray-400">
            {iniciais}
          </div>
        )}
      </div>

      {/* Nome */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
          {nome}
        </p>

        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="badge bg-blue-100 text-blue-700 border-blue-200 text-[11px]">
            {siglaPartido}
          </span>
          <span className="badge bg-gray-100 text-gray-600 border-gray-200 text-[11px]">
            {siglaUf}
          </span>
        </div>
      </div>

      {/* Link para proposições do deputado */}
      <Link
        href={`/proposicoes?modo=direto&casaBusca=federal&deputadoId=${id}&deputadoNome=${encodeURIComponent(nome)}`}
        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
      >
        <BookOpen className="w-3 h-3" />
        Ver proposições
      </Link>
    </div>
  );
}

function buildUrl(
  current: SearchParams,
  updates: Partial<Record<keyof SearchParams, string | undefined>>
): string {
  const merged = { ...current, ...updates };
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) p.set(k, v);
  }
  const str = p.toString();
  return str ? `/deputados?${str}` : "/deputados";
}
