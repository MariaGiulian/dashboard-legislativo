"use client";

import { useState } from "react";
import { Clock, Building2, CheckCircle, XCircle, ExternalLink, ChevronDown, Users } from "lucide-react";
import { type Votacao, type ResumoPlacar } from "@/types";
import { cn, formatVotacaoDate, formatRelative, getResultadoColor } from "@/lib/utils";
import { differenceInHours, parseISO } from "date-fns";

interface VotacaoCardProps {
  votacao: Votacao;
}

export function VotacaoCard({ votacao }: VotacaoCardProps) {
  const { id, descricao, orgao, dataHora, resultado, uri } = votacao;
  const horasAte = differenceInHours(parseISO(dataHora), new Date());
  const isFutura = horasAte > 0;
  const isProxima = isFutura && horasAte <= 24;
  const isRealizada = !isFutura;

  const [placar, setPlacar] = useState<ResumoPlacar | null>(null);
  const [loadingPlacar, setLoadingPlacar] = useState(false);
  const [showPlacar, setShowPlacar] = useState(false);

  async function carregarPlacar() {
    if (placar) {
      setShowPlacar((v) => !v);
      return;
    }
    setLoadingPlacar(true);
    try {
      const res = await fetch(`/api/votacoes/${id}/votos`);
      if (res.ok) {
        const data = await res.json();
        setPlacar(data.placar);
        setShowPlacar(true);
      }
    } finally {
      setLoadingPlacar(false);
    }
  }

  return (
    <div
      className={cn(
        "card flex flex-col gap-3",
        isProxima && "border-amber-300 bg-amber-50",
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {isProxima && (
            <span className="badge bg-amber-100 text-amber-700 border-amber-200">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Em breve
            </span>
          )}
          {isFutura && !isProxima && (
            <span className="badge bg-blue-100 text-blue-700 border-blue-200">
              Agendada
            </span>
          )}
          {isRealizada && resultado && (
            <span className={cn("badge", getResultadoColor(resultado))}>
              {resultado === "Aprovada"
                ? <CheckCircle className="w-3 h-3" />
                : <XCircle className="w-3 h-3" />}
              {resultado}
            </span>
          )}
          {isRealizada && !resultado && (
            <span className="badge bg-gray-100 text-gray-500 border-gray-200">
              Realizada
            </span>
          )}
        </div>

        {uri && (
          <a
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            title="Ver no site da Câmara"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Descrição */}
      <p className="text-sm text-gray-700 leading-relaxed">{descricao}</p>

      {/* Metadados */}
      <div className="flex items-center gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3" />
          {orgao}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {isRealizada ? formatRelative(dataHora) : formatVotacaoDate(dataHora)}
        </span>
      </div>

      {/* Alerta de proximidade */}
      {isProxima && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            {horasAte <= 1
              ? "Votação em menos de 1 hora!"
              : `Votação em ${horasAte} horas`}
          </p>
        </div>
      )}

      {/* Análise de votos (apenas para votações realizadas) */}
      {isRealizada && (
        <div>
          <button
            onClick={carregarPlacar}
            disabled={loadingPlacar}
            className="btn-ghost text-xs py-1 px-2 h-auto"
          >
            {loadingPlacar ? (
              <span className="spinner w-3 h-3" />
            ) : (
              <Users className="w-3 h-3" />
            )}
            {placar ? (showPlacar ? "Ocultar placar" : "Ver placar") : "Analisar votos"}
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform",
                showPlacar && "rotate-180"
              )}
            />
          </button>

          {showPlacar && placar && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <PlacarBar placar={placar} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlacarBar({ placar }: { placar: ResumoPlacar }) {
  const { sim, nao, abstencao, obstrucao, total } = placar;
  if (total === 0) return null;

  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <div className="space-y-2">
      {/* Barra visual */}
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {sim > 0 && (
          <div
            className="bg-green-400 transition-all"
            style={{ width: `${pct(sim)}%` }}
            title={`Sim: ${sim}`}
          />
        )}
        {nao > 0 && (
          <div
            className="bg-red-400 transition-all"
            style={{ width: `${pct(nao)}%` }}
            title={`Não: ${nao}`}
          />
        )}
        {abstencao > 0 && (
          <div
            className="bg-amber-300 transition-all"
            style={{ width: `${pct(abstencao)}%` }}
            title={`Abstenção: ${abstencao}`}
          />
        )}
        {obstrucao > 0 && (
          <div
            className="bg-gray-300 transition-all"
            style={{ width: `${pct(obstrucao)}%` }}
            title={`Obstrução: ${obstrucao}`}
          />
        )}
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {sim > 0 && (
          <span className="flex items-center gap-1 text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            Sim: <strong>{sim}</strong>
            <span className="text-gray-400">({pct(sim)}%)</span>
          </span>
        )}
        {nao > 0 && (
          <span className="flex items-center gap-1 text-red-700">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Não: <strong>{nao}</strong>
            <span className="text-gray-400">({pct(nao)}%)</span>
          </span>
        )}
        {abstencao > 0 && (
          <span className="flex items-center gap-1 text-amber-700">
            <span className="w-2 h-2 rounded-full bg-amber-300" />
            Abstenção: <strong>{abstencao}</strong>
          </span>
        )}
        {obstrucao > 0 && (
          <span className="flex items-center gap-1 text-gray-500">
            <span className="w-2 h-2 rounded-full bg-gray-300" />
            Obstrução: <strong>{obstrucao}</strong>
          </span>
        )}
        <span className="ml-auto text-gray-400">{total} votos registrados</span>
      </div>
    </div>
  );
}
