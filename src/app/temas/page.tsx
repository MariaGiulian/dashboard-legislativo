/**
 * Página de gerenciamento de temas monitorados.
 * Permite adicionar e remover palavras-chave.
 */

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { KeywordManager } from "@/components/KeywordManager";
import { BookOpen, Tag } from "lucide-react";
import type { Keyword } from "@/types";

export const revalidate = 0; // sempre busca dados frescos

async function getKeywords(): Promise<Keyword[]> {
  const keywords = await prisma.keyword.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { proposicoes: true } },
    },
  });

  return keywords.map((k) => ({
    ...k,
    createdAt: k.createdAt.toISOString(),
    _count: { proposicoes: k._count.proposicoes },
  }));
}

export default async function TemasPage() {
  const keywords = await getKeywords();

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Meus Temas"
        subtitle="Gerencie as palavras-chave que você quer monitorar"
      />

      <div className="flex-1 px-8 py-6 max-w-2xl">

        {/* Introdução */}
        <div className="card bg-blue-500/5 border-blue-500/15 mb-6">
          <div className="flex gap-3">
            <Tag className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-slate-200 mb-1">Como funciona</p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Adicione temas que você quer acompanhar. O monitor busca proposições
                que contenham essas palavras nas ementas da{" "}
                <strong className="text-federal">Câmara Federal</strong> e da{" "}
                <strong className="text-poa">Câmara Municipal de Porto Alegre</strong>.
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Exemplos: <em>"inteligência artificial"</em>, <em>"proteção de dados"</em>,{" "}
                <em>"advocacia"</em>, <em>"meio ambiente"</em>
              </p>
            </div>
          </div>
        </div>

        <KeywordManager initialKeywords={keywords} />

        {/* Dica sobre o monitor */}
        {keywords.length > 0 && (
          <div className="mt-6 flex items-start gap-2 text-xs text-slate-600">
            <BookOpen className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <p>
              O monitor é executado automaticamente todo dia às 8h (via Vercel Cron).
              Você também pode acionar manualmente pelo Dashboard.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
