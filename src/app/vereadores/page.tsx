/**
 * Página de Vereadores de Porto Alegre.
 * Consulta direta ao site da Câmara Municipal de Porto Alegre.
 */

import { Header } from "@/components/layout/Header";
import { buscarVereadoresPOA } from "@/lib/api/camara-poa";
import { ExternalLink, Search, Users } from "lucide-react";
import type { VereadorPOA } from "@/types";

export const revalidate = 3600;

interface SearchParams {
  nome?: string;
  partido?: string;
}

export default async function VereadoresPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const vereadores = await buscarVereadoresPOA();
  const partidos = Array.from(new Set(vereadores.map((v) => v.partido))).sort();
  const nomeFiltro = params.nome?.trim().toLowerCase();
  const partidoFiltro = params.partido?.trim();

  const filtrados = vereadores.filter((vereador) => {
    const matchesNome = nomeFiltro
      ? vereador.nome.toLowerCase().includes(nomeFiltro)
      : true;
    const matchesPartido = partidoFiltro
      ? vereador.partido === partidoFiltro
      : true;

    return matchesNome && matchesPartido;
  });

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Vereadores de Porto Alegre"
        subtitle={
          filtrados.length > 0
            ? `${filtrados.length} vereador${filtrados.length !== 1 ? "es" : ""} encontrado${filtrados.length !== 1 ? "s" : ""} — Câmara Municipal`
            : "Câmara Municipal de Porto Alegre"
        }
      />

      <div className="flex flex-1">
        <aside className="w-56 flex-shrink-0 border-r border-gray-200 px-4 py-6 space-y-5">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <Search className="w-3.5 h-3.5" />
            Filtros
          </div>

          <form method="GET" action="/vereadores" className="space-y-4">
            <div>
              <label className="label">Nome</label>
              <input
                type="text"
                name="nome"
                defaultValue={params.nome ?? ""}
                placeholder="Ex: Maria, João..."
                className="input text-sm"
              />
            </div>

            <div>
              <label className="label">Partido</label>
              <select
                name="partido"
                defaultValue={params.partido ?? ""}
                className="input text-sm"
              >
                <option value="">Todos os partidos</option>
                {partidos.map((partido) => (
                  <option key={partido} value={partido}>
                    {partido}
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn-primary w-full justify-center">
              <Search className="w-4 h-4" />
              Filtrar
            </button>

            {(params.nome || params.partido) && (
              <a
                href="/vereadores"
                className="btn-secondary w-full justify-center text-xs"
              >
                Limpar filtros
              </a>
            )}
          </form>
        </aside>

        <div className="flex-1 px-8 py-6">
          {filtrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum vereador encontrado</p>
              <p className="text-sm text-gray-400 mt-1">
                Tente remover ou ajustar os filtros
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 stagger">
              {filtrados.map((vereador) => (
                <VereadorCard key={vereador.id} vereador={vereador} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function VereadorCard({ vereador }: { vereador: VereadorPOA }) {
  const iniciais = vereador.nome
    .split(" ")
    .filter((_, i, arr) => i === 0 || i === arr.length - 1)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <a
      href={vereador.url}
      target="_blank"
      rel="noopener noreferrer"
      className="card flex flex-col items-center text-center gap-3 py-5 animate-fade-in hover:border-green-300 hover:shadow-md transition-all"
    >
      <div className="relative w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex-shrink-0">
        {vereador.fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={vereador.fotoUrl}
            alt={vereador.nome}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-gray-400">
            {iniciais}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">
          {vereador.nome}
        </p>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          <span className="badge bg-green-100 text-green-700 border-green-200 text-[11px]">
            {vereador.partido}
          </span>
          {vereador.situacao && (
            <span className="badge bg-gray-100 text-gray-600 border-gray-200 text-[11px]">
              {vereador.situacao}
            </span>
          )}
        </div>
      </div>

      <span className="text-xs text-blue-600 hover:underline flex items-center gap-1">
        <ExternalLink className="w-3 h-3" />
        Ver perfil
      </span>
    </a>
  );
}
