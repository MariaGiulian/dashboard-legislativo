import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── CSS Utilities ────────────────────────────────────────────────────────────

/** Combina classes Tailwind sem conflitos */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Datas ────────────────────────────────────────────────────────────────────

/** Formata data para exibição no padrão brasileiro */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy", { locale: ptBR });
}

/** Formata data e hora */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

/** Retorna tempo relativo legível ("há 2 horas", "ontem", "há 3 dias") */
export function formatRelative(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (isToday(d)) return "hoje";
  if (isYesterday(d)) return "ontem";
  return formatDistanceToNow(d, { locale: ptBR, addSuffix: true });
}

/** Formata data de votação com ênfase em proximidade */
export function formatVotacaoDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "EEEE, dd/MM 'às' HH:mm", { locale: ptBR });
}

// ─── Texto ────────────────────────────────────────────────────────────────────

/** Trunca texto mantendo palavras inteiras */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated) + "…";
}

/** Destaca ocorrências de uma keyword no texto (retorna HTML safe) */
export function highlightKeyword(text: string, keyword: string): string {
  if (!keyword) return text;
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "gi");
  return text.replace(regex, "<mark>$1</mark>");
}

/** Capitaliza primeira letra */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// ─── IDs e Slugs ─────────────────────────────────────────────────────────────

/** Gera ID único para proposições do POA (que não têm ID numérico) */
export function generatePoaId(tipo: string, numero: number, ano: number): string {
  return `poa-${tipo.toLowerCase()}-${numero}-${ano}`;
}

/** Formata o código de um PL para exibição: "PL 1234/2025" */
export function formatProposicao(tipo: string, numero: number, ano: number): string {
  return `${tipo} ${numero}/${ano}`;
}

// ─── Validação ────────────────────────────────────────────────────────────────

/** Valida se uma keyword tem tamanho adequado para busca */
export function validateKeyword(keyword: string): string | null {
  const trimmed = keyword.trim();
  if (trimmed.length < 3) return "A palavra-chave deve ter pelo menos 3 caracteres";
  if (trimmed.length > 50) return "A palavra-chave deve ter no máximo 50 caracteres";
  if (!/^[a-zA-ZÀ-ÿ0-9\s\-_]+$/.test(trimmed))
    return "Use apenas letras, números, espaços e hífens";
  return null;
}

// ─── Cores e Badges ───────────────────────────────────────────────────────────

/** Retorna a classe de cor baseada no tipo de proposição */
export function getProposicaoColor(siglaTipo: string): string {
  const colors: Record<string, string> = {
    PL: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    PEC: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    PDL: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    PLP: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
    MPV: "bg-red-500/20 text-red-300 border-red-500/30",
    INC: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  };
  return colors[siglaTipo] ?? "bg-slate-500/20 text-slate-300 border-slate-500/30";
}

/** Retorna cor baseada na casa legislativa */
export function getCasaColor(casa: "federal" | "poa"): string {
  return casa === "federal"
    ? "bg-federal/20 text-federal border-federal/30"
    : "bg-poa/20 text-poa border-poa/30";
}

/** Label legível para a casa legislativa */
export function getCasaLabel(casa: "federal" | "poa"): string {
  return casa === "federal" ? "Câmara Federal" : "Câmara Municipal POA";
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

/** Adiciona delay entre requisições para ser respeitoso com as APIs */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retorna os headers padrão para requisições às APIs públicas */
export function getDefaultHeaders(): Record<string, string> {
  return {
    Accept: "application/json",
    "User-Agent": "LegislaMonitor/1.0 (portfolio; github.com/seu-usuario/legisla-monitor)",
  };
}
