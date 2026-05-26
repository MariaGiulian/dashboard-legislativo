"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, CheckCircle2 } from "lucide-react";

/**
 * Botão que aciona o monitor manualmente e recarrega a página com os resultados.
 * Separado em Client Component pois usa useState + useRouter.
 */
export function RefreshDashboard() {
  const router = useRouter();
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [summary, setSummary] = useState<string | null>(null);

  async function handleRefresh() {
    setStatus("loading");
    setSummary(null);

    try {
      const res = await fetch("/api/monitor", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setSummary(data.error ?? "Erro ao buscar");
        return;
      }

      const { novas, atualizadas } = data.data;
      setSummary(`${novas} nova(s) proposição(ões), ${atualizadas} atualizada(s).`);
      setStatus("done");
      router.refresh();
    } catch {
      setStatus("error");
      setSummary("Erro de conexão");
    }
  }

  return (
    <div className="card border-dashed">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-300">Buscar agora</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Aciona o monitor manualmente para todas as palavras-chave configuradas.
            {status === "done" && summary && (
              <span className="text-emerald-400 ml-1">✓ {summary}</span>
            )}
            {status === "error" && summary && (
              <span className="text-red-400 ml-1">{summary}</span>
            )}
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={status === "loading"}
          className="btn-secondary shrink-0"
        >
          {status === "loading" ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Buscando…
            </>
          ) : status === "done" ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Concluído
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              Buscar
            </>
          )}
        </button>
      </div>
    </div>
  );
}
