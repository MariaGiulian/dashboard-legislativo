import Link from "next/link";
import { Calendar, User, ArrowRight, Sparkles, Tag } from "lucide-react";
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
  const { id, siglaTipo, numero, ano, ementa, autor, dataApresentacao, status, casa, aiSummary, keywordsApi } =
    proposicao;

  const codigo = formatProposicao(siglaTipo, numero, ano);
  const ementaTruncada = truncate(ementa, compact ? 120 : 200);
  const isRecente = new Date(dataApresentacao) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Keywords registradas na Câmara Federal — separadas por vírgula, ponto ou underline
  const apiTags = keywordsApi
    ? keywordsApi.split(/[,._]/).map((k) => k.trim()).filter((k) => k.length > 2).slice(0, 4)
    : [];

  return (
    <Link
      href={`/proposicoes/${id}`}
      className="card-hover group flex flex-col gap-3 animate-fade-in"
    >
      {/* Cabeçalho: badges e código */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
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
            <span className="badge bg-green-100 text-green-700 border-green-200">
              Nova
            </span>
          )}

          {/* Indica que tem resumo IA disponível */}
          {aiSummary && (
            <span className="badge bg-purple-100 text-purple-700 border-purple-200">
              <Sparkles className="w-3 h-3" />
              IA
            </span>
          )}
        </div>

        <span className="text-xs font-mono text-gray-400 whitespace-nowrap shrink-0">
          {codigo}
        </span>
      </div>

      {/* Ementa */}
      <p
        className="text-sm text-gray-700 leading-relaxed"
        dangerouslySetInnerHTML={{
          __html: highlight
            ? ementaTruncada.replace(
                new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                "<mark>$1</mark>"
              )
            : ementaTruncada,
        }}
      />

      {/* Tags de classificação temática da Câmara */}
      {apiTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Tag className="w-3 h-3 text-gray-400 mt-0.5 flex-shrink-0" />
          {apiTags.map((tag, i) => (
            <span
              key={i}
              className="badge bg-green-50 text-green-700 border-green-200 text-[10px] py-0"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Rodapé: metadados */}
      {!compact && (
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[200px]">{autor}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3 h-3" />
            {formatDate(dataApresentacao)}
          </span>
          <span className="ml-auto text-gray-400">{formatRelative(dataApresentacao)}</span>
        </div>
      )}

      {/* Status atual */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-0.5 truncate max-w-xs">
          {status}
        </span>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
      </div>
    </Link>
  );
}
