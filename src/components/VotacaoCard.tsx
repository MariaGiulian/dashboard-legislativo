import { Clock, Building2, CheckCircle, XCircle, ExternalLink } from "lucide-react";
import { type Votacao } from "@/types";
import { cn, formatVotacaoDate, formatRelative } from "@/lib/utils";
import { differenceInHours, parseISO } from "date-fns";

interface VotacaoCardProps {
  votacao: Votacao;
}

export function VotacaoCard({ votacao }: VotacaoCardProps) {
  const { descricao, orgao, dataHora, resultado, uri } = votacao;
  const horasAte = differenceInHours(parseISO(dataHora), new Date());
  const isFutura = horasAte > 0;
  const isProxima = isFutura && horasAte <= 24;
  const isRealizada = !isFutura;

  return (
    <div
      className={cn(
        "card flex flex-col gap-3",
        isProxima && "border-amber-500/40 bg-amber-500/5",
        isRealizada && "opacity-70"
      )}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Status badge */}
          {isProxima && (
            <span className="badge bg-amber-500/20 text-amber-300 border-amber-500/40">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Em breve
            </span>
          )}
          {isFutura && !isProxima && (
            <span className="badge bg-blue-500/20 text-blue-300 border-blue-500/40">
              Agendada
            </span>
          )}
          {isRealizada && resultado && (
            <>
              {resultado === "Aprovada" ? (
                <span className="badge bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                  <CheckCircle className="w-3 h-3" />
                  Aprovada
                </span>
              ) : (
                <span className="badge bg-red-500/20 text-red-300 border-red-500/40">
                  <XCircle className="w-3 h-3" />
                  Rejeitada
                </span>
              )}
            </>
          )}
          {isRealizada && !resultado && (
            <span className="badge bg-slate-700 text-slate-400 border-slate-600">
              Realizada
            </span>
          )}
        </div>

        {uri && (
          <a
            href={uri}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
            title="Ver no site da Câmara"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Descrição */}
      <p className="text-sm text-slate-200 leading-relaxed">{descricao}</p>

      {/* Metadados */}
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <Building2 className="w-3 h-3" />
          {orgao}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {isRealizada
            ? formatRelative(dataHora)
            : formatVotacaoDate(dataHora)}
        </span>
      </div>

      {/* Alerta de proximidade */}
      {isProxima && (
        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-300">
            {horasAte <= 1
              ? "Votação em menos de 1 hora!"
              : `Votação em ${horasAte} horas`}
          </p>
        </div>
      )}
    </div>
  );
}
