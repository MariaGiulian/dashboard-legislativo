"use client";

import { useState } from "react";
import { RefreshCw, Bell, BellDot } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  onRefresh?: () => void | Promise<void>;
}

export function Header({ title, subtitle, unreadCount = 0, onRefresh }: HeaderProps) {
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    if (!onRefresh || loading) return;
    setLoading(true);
    try {
      await onRefresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <header className="flex items-center justify-between py-5 px-8 border-b border-slate-800 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h2 className="text-lg font-semibold text-slate-100">{title}</h2>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Notificações */}
        <div className="relative">
          {unreadCount > 0 ? (
            <BellDot className="w-5 h-5 text-blue-400" />
          ) : (
            <Bell className="w-5 h-5 text-slate-500" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        {/* Botão de atualização manual */}
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
              "btn-secondary text-xs",
              loading && "opacity-70"
            )}
            title="Buscar novas proposições agora"
          >
            <RefreshCw
              className={cn("w-3.5 h-3.5", loading && "animate-spin")}
            />
            {loading ? "Buscando…" : "Atualizar"}
          </button>
        )}
      </div>
    </header>
  );
}
