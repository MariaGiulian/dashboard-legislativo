"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  FileText,
  GitBranch,
  Vote,
  BarChart2,
  CheckCircle2,
} from "lucide-react";
import { type Notification, type TipoNotificacao } from "@/types";
import { cn, formatRelative } from "@/lib/utils";

const ICON_MAP: Record<TipoNotificacao, React.ElementType> = {
  nova_proposicao: FileText,
  tramitacao: GitBranch,
  votacao: Vote,
  resumo_semanal: BarChart2,
};

const COLOR_MAP: Record<TipoNotificacao, string> = {
  nova_proposicao: "text-blue-400 bg-blue-500/15",
  tramitacao: "text-amber-400 bg-amber-500/15",
  votacao: "text-emerald-400 bg-emerald-500/15",
  resumo_semanal: "text-purple-400 bg-purple-500/15",
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead?: (id: string) => void;
}

export function NotificationItem({ notification, onMarkRead }: NotificationItemProps) {
  const { id, tipo, titulo, mensagem, proposicao, read, createdAt } = notification;
  const [isRead, setIsRead] = useState(read);

  const Icon = ICON_MAP[tipo] ?? Bell;
  const colorClass = COLOR_MAP[tipo] ?? "text-slate-400 bg-slate-500/15";

  async function handleMarkRead() {
    if (isRead) return;
    setIsRead(true);
    onMarkRead?.(id);

    // Persiste no servidor
    await fetch(`/api/notifications`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(console.error);
  }

  const content = (
    <div
      className={cn(
        "flex gap-3 p-4 rounded-xl border transition-colors animate-fade-in",
        isRead
          ? "bg-slate-900/40 border-slate-800/50"
          : "bg-slate-800 border-slate-700 shadow-sm"
      )}
    >
      {/* Ícone do tipo */}
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", colorClass)}>
        <Icon className="w-4 h-4" />
      </div>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm font-medium leading-tight",
              isRead ? "text-slate-400" : "text-slate-100"
            )}
          >
            {titulo}
          </p>
          <span className="text-xs text-slate-600 whitespace-nowrap flex-shrink-0">
            {formatRelative(createdAt)}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
          {mensagem}
        </p>

        {/* Código do PL se disponível */}
        {proposicao && (
          <span className="inline-block mt-1.5 text-xs text-slate-600 font-mono">
            {proposicao.siglaTipo} {proposicao.numero}/{proposicao.ano}
          </span>
        )}
      </div>

      {/* Indicador de não lido + botão de marcar como lido */}
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        {!isRead && (
          <button
            onClick={(e) => {
              e.preventDefault();
              handleMarkRead();
            }}
            className="w-2 h-2 rounded-full bg-blue-500 hover:scale-125 transition-transform"
            title="Marcar como lido"
          />
        )}
        {isRead && (
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-700" />
        )}
      </div>
    </div>
  );

  // Se tem PL associado, o card inteiro é um link
  if (proposicao?.id) {
    return (
      <Link href={`/proposicoes/${proposicao.id}`} onClick={handleMarkRead}>
        {content}
      </Link>
    );
  }

  return <div onClick={handleMarkRead}>{content}</div>;
}
