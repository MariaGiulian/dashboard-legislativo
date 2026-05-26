"use client";

import { useState } from "react";
import { Plus, X, Tag, Loader2 } from "lucide-react";
import { type Keyword } from "@/types";
import { cn, validateKeyword } from "@/lib/utils";

interface KeywordManagerProps {
  initialKeywords: Keyword[];
}

// Sugestões de temas pré-definidos para facilitar o uso
const SUGGESTED_KEYWORDS = [
  "inteligência artificial",
  "proteção de dados",
  "advocacia",
  "tecnologia",
  "meio ambiente",
  "saúde pública",
  "educação",
  "segurança pública",
  "habitação",
  "mobilidade urbana",
];

export function KeywordManager({ initialKeywords }: KeywordManagerProps) {
  const [keywords, setKeywords] = useState<Keyword[]>(initialKeywords);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const existingTexts = new Set(keywords.map((k) => k.text.toLowerCase()));

  async function handleAdd(text?: string) {
    const value = (text ?? input).trim();
    const validationError = validateKeyword(value);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (existingTexts.has(value.toLowerCase())) {
      setError("Você já está monitorando este tema");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Erro ao adicionar tema");
        return;
      }

      const { data } = await res.json();
      setKeywords((prev) => [...prev, data]);
      setInput("");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/keywords/${id}`, { method: "DELETE" });
      setKeywords((prev) => prev.filter((k) => k.id !== id));
    } catch {
      // Revert otimisticamente se falhar
    } finally {
      setDeletingId(null);
    }
  }

  const suggestions = SUGGESTED_KEYWORDS.filter(
    (s) => !existingTexts.has(s.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Adicionar novo tema */}
      <div className="card">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4 text-blue-400" />
          Adicionar tema
        </h3>

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder='Ex: "inteligência artificial", "proteção de dados"'
            className="input flex-1"
            disabled={loading}
            maxLength={50}
          />
          <button
            onClick={() => handleAdd()}
            disabled={loading || !input.trim()}
            className="btn-primary"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Seguir
          </button>
        </div>

        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
      </div>

      {/* Keywords ativas */}
      {keywords.length > 0 ? (
        <div className="card">
          <h3 className="text-sm font-medium text-slate-300 mb-3">
            Monitorando ({keywords.length} {keywords.length === 1 ? "tema" : "temas"})
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <div
                key={kw.id}
                className={cn(
                  "flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/25",
                  "text-blue-300 rounded-full pl-3 pr-1.5 py-1 text-sm",
                  "transition-opacity",
                  deletingId === kw.id && "opacity-50"
                )}
              >
                <span>{kw.text}</span>
                {kw._count && (
                  <span className="text-xs text-blue-500">
                    ({kw._count.proposicoes})
                  </span>
                )}
                <button
                  onClick={() => handleDelete(kw.id)}
                  disabled={deletingId === kw.id}
                  className="w-5 h-5 rounded-full hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                  title={`Parar de monitorar "${kw.text}"`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="card border-dashed text-center py-8">
          <Tag className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-sm text-slate-500">Nenhum tema monitorado ainda</p>
          <p className="text-xs text-slate-600 mt-1">
            Adicione um tema acima para começar
          </p>
        </div>
      )}

      {/* Sugestões */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
            Sugestões de temas
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.slice(0, 8).map((s) => (
              <button
                key={s}
                onClick={() => handleAdd(s)}
                className="badge bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
