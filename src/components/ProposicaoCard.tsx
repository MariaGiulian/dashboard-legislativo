import Link from "next/link";
import { Calendar, User, ArrowRight, Sparkles } from "lucide-react";
import { type Proposicao } from "@/types";
import {
  cn,
  formatDate,
  formatRelative,
  truncate,
  getProposicaoColor,
  getCasaColor,
  getCasaLabel,
  formatProposicao,
} from "@/lib/utils";

interface ProposicaoCardProps {
  proposicao: Proposicao;
  /** Keyword a destacar na ementa */
  highlight?: string;
  /** Mostra versão compacta sem detalhes extras */
  compact?: boolean;
}

export function ProposicaoCard({ proposicao, highlight, compact = false }: ProposicaoCardProps) {
  const { id, siglaTipo, numero, ano, ementa, autor, dataApresentacao, status, casa, aiSummary } =
    proposicao;

  const codigo = formatProposicao(siglaTipo, numero, ano);
  const ementaTruncada = truncate(ementa, compact ? 120 : 200);
  const isRecente = new Date(dataApresentacao) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return (
    <Link
      href={`/proposicoes/${id}`}
      className="card-hover group flex flex-col gap-3 animate-fade-in"
    >
      {/* Cabeçalho: badges e código */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo de proposição */}
          <span className={cn("badge", getProposicaoColor(siglaTipo))}>
            {siglaTipo}
          </span>

          {/* Casa legislativa */}
          <span className={cn("badge", getCasaColor(casa))}>
            {getCasaLabel(casa)}
          </span>

          {/* Badge "Nova" para proposições da última semana */}
          {isRecente && (
            <span className="badge bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              Nova
            </span>
          )}

          {/* Indica que tem resumo IA disponível */}
          {aiSummary && (
            <span className="badge bg-purple-500/20 text-purple-300 border-purple-500/30">
              <Sparkles className="w-3 h-3" />
              IA
            </span>
          )}
        </div>

        <span className="text-xs font-mono text-slate-400 whitespace-nowrap shrink-0">
          {codigo}
        </span>
      </div>

      {/* Ementa */}
      <p
        className="text-sm text-slate-200 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: highlight
            ? ementaTruncada.replace(
                new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                "<mark>$1</mark>"
              )
            : ementaTruncada,
        }}
      />

      {/* Rodapé: metadados */}
      {!compact && (
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{autor}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {formatDate(dataApresentacao)}
          </span>
          <span className="ml-auto text-slate-600">{formatRelative(dataApresentacao)}</span>
        </div>
      )}

      {/* Status atual */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 bg-slate-900/50 rounded px-2 py-0.5 truncate max-w-xs">
          {status}
        </span>
        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}
