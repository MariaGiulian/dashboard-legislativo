"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { Partido } from "@/types";
import type { SearchParams } from "./page";

interface ProposicoesDiretoFiltersProps {
  params: SearchParams;
  casaBusca: "federal" | "poa";
  partidos: Partido[];
  ufs: string[];
  tipos: string[];
  anos: number[];
  showClear: boolean;
}

export function ProposicoesDiretoFilters({
  params,
  casaBusca,
  partidos,
  ufs,
  tipos,
  anos,
  showClear,
}: ProposicoesDiretoFiltersProps) {
  const [origem, setOrigem] = useState<"federal" | "poa">(casaBusca);
  const isFederal = origem === "federal";

  return (
    <>
      {isFederal && params.deputadoNome && (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
          Proposições de <strong>{params.deputadoNome}</strong>
          <a
            href="/proposicoes?modo=direto&casaBusca=federal"
            className="block mt-1 text-blue-500 hover:underline"
          >
            Limpar filtro ×
          </a>
        </div>
      )}

      <form method="GET" action="/proposicoes" className="space-y-3">
        <input type="hidden" name="modo" value="direto" />
        <input type="hidden" name="paginaD" value="1" />
        {isFederal && params.deputadoId && (
          <input type="hidden" name="deputadoId" value={params.deputadoId} />
        )}
        {isFederal && params.deputadoNome && (
          <input type="hidden" name="deputadoNome" value={params.deputadoNome} />
        )}

        <div>
          <label className="label">Origem</label>
          <select
            name="casaBusca"
            value={origem}
            onChange={(event) => setOrigem(event.target.value === "poa" ? "poa" : "federal")}
            className="input text-sm"
          >
            <option value="federal">Câmara Federal</option>
            <option value="poa">Câmara Municipal (POA)</option>
          </select>
        </div>

        <div>
          <label className="label">Palavras-chave</label>
          <input
            type="text"
            name="busca"
            defaultValue={params.busca ?? ""}
            placeholder="Ex: inteligência artificial"
            className="input text-sm"
          />
        </div>

        <div>
          <label className="label">Tipo</label>
          <select name="tipoD" defaultValue={params.tipoD ?? ""} className="input text-sm">
            <option value="">Todos</option>
            {tipos.map((tipo) => (
              <option key={tipo} value={tipo}>
                {tipo}
              </option>
            ))}
          </select>
        </div>

        {isFederal && (
          <>
            <div>
              <label className="label">Estado do autor</label>
              <select name="uf" defaultValue={params.uf ?? ""} className="input text-sm">
                <option value="">Todos</option>
                {ufs.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Partido do autor</label>
              <select name="partido" defaultValue={params.partido ?? ""} className="input text-sm">
                <option value="">Todos</option>
                {partidos.map((partido) => (
                  <option key={partido.id} value={partido.sigla}>
                    {partido.sigla}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}

        <div>
          <label className="label">Ano</label>
          <select name="ano" defaultValue={params.ano ?? ""} className="input text-sm">
            <option value="">Qualquer ano</option>
            {anos.map((ano) => (
              <option key={ano} value={String(ano)}>
                {ano}
              </option>
            ))}
          </select>
        </div>

        <button type="submit" className="btn-primary w-full justify-center">
          <Search className="w-4 h-4" />
          Buscar
        </button>

        {showClear && (
          <a
            href={`/proposicoes?modo=direto&casaBusca=${origem}`}
            className="btn-secondary w-full justify-center text-xs"
          >
            Limpar todos
          </a>
        )}
      </form>
    </>
  );
}
