"use client";

import { useState } from "react";
import { Sparkles, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AISummaryProps {
  proposicaoId: string;
  initialSummary?: string | null;
}

export function AISummary({ proposicaoId, initialSummary }: AISummaryProps) {
  const [summary, setSummary] = useState<string | null>(initialSummary ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateSummary() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/proposicoes/${proposicaoId}/summary`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        // API Key não configurada é tratada como aviso, não erro crítico
        if (res.status === 503) {
          setError("Configure ANTHROPIC_API_KEY para ativar resumos com IA.");
        } else {
          setError(data.error ?? "Não foi possível gerar o resumo.");
        }
        return;
      }

      const { data } = await res.json();
      setSummary(data.summary);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // ─── Sem resumo ainda ─────────────────────────────────────────────────────
  if (!summary) {
    return (
      <div className="card border-dashed">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/25 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-300">Resumo por IA</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Gere um resumo acessível deste PL em linguagem simples.
            </p>

            {error && (
              <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              onClick={generateSummary}
              disabled={loading}
              className={cn("btn-secondary mt-3 text-xs", loading && "opacity-70")}
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Gerando resumo…
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Gerar resumo com IA
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── Resumo disponível ────────────────────────────────────────────────────
  return (
    <div className="card border-purple-500/20 bg-purple-500/5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-purple-300">Resumo por IA</span>
          <span className="badge bg-purple-500/15 text-purple-400 border-purple-500/20 text-[10px]">
            Claude
          </span>
        </div>

        <button
          onClick={generateSummary}
          disabled={loading}
          className="btn-ghost text-xs"
          title="Regenerar resumo"
        >
          <RefreshCw className={cn("w-3 h-3", loading && "animate-spin")} />
        </button>
      </div>

      {/* Render do markdown gerado pela IA */}
      <div
        className="prose-ai"
        dangerouslySetInnerHTML={{
          __html: markdownToHtml(summary),
        }}
      />

      <p className="text-[10px] text-slate-600 mt-3 border-t border-purple-500/10 pt-2">
        Gerado por IA — verifique sempre o texto original do PL
      </p>
    </div>
  );
}

/** Converte Markdown básico para HTML (sem biblioteca externa) */
function markdownToHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<h[23]>)(.+)$/gm, (line) =>
      line.startsWith("<") ? line : `<p>${line}</p>`
    )
    .replace(/<p><\/p>/g, "");
}
