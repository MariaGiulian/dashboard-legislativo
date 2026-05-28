import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { KeywordManager } from "@/components/KeywordManager";
import { BookOpen, Tag, AlertCircle } from "lucide-react";
import type { Keyword } from "@/types";

export const revalidate = 0;

async function getKeywords(): Promise<{ keywords: Keyword[]; dbOk: boolean }> {
  const keywords = await prisma.keyword.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { proposicoes: true } },
    },
  });

  return {
    keywords: keywords.map((k) => ({
      ...k,
      createdAt: k.createdAt.toISOString(),
      _count: { proposicoes: k._count.proposicoes },
    })),
    dbOk: true,
  };
}

export default async function TemasPage() {
  const { keywords, dbOk } = await getKeywords().catch(() => ({
    keywords: [] as Keyword[],
    dbOk: false,
  }));

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Meus Temas"
        subtitle="Gerencie as palavras-chave que você quer monitorar"
      />

      <div className="flex-1 px-8 py-6 max-w-2xl">

        {/* Aviso: banco não configurado */}
        {!dbOk && (
          <div className="card border-amber-300 bg-amber-50 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  Banco de dados não configurado
                </p>
                <p className="text-xs text-amber-700 leading-relaxed mb-2">
                  Os temas são salvos no banco. Adicione a URL do PostgreSQL no{" "}
                  <code className="bg-amber-100 px-1 rounded">.env.local</code>:
                </p>
                <pre className="text-xs bg-amber-100 border border-amber-200 rounded p-2 text-amber-900 overflow-x-auto">
                  DATABASE_URL=&quot;postgresql://user:pass@host:port/db&quot;{"\n"}
                  DIRECT_URL=&quot;postgresql://user:pass@host:port/db&quot;
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Introdução */}
        <div className="card bg-blue-50 border-blue-200 mb-6">
          <div className="flex gap-3">
            <Tag className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">Como funciona</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Adicione temas que você quer acompanhar. O monitor busca proposições
                que contenham essas palavras nas ementas da{" "}
                <strong className="text-blue-600">Câmara Federal</strong> e da{" "}
                <strong className="text-green-600">Câmara Municipal de Porto Alegre</strong>.
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Exemplos: <em>"inteligência artificial"</em>, <em>"proteção de dados"</em>,{" "}
                <em>"advocacia"</em>, <em>"meio ambiente"</em>
              </p>
            </div>
          </div>
        </div>

        {dbOk && <KeywordManager initialKeywords={keywords} />}

        {dbOk && keywords.length > 0 && (
          <div className="mt-6 flex items-start gap-2 text-xs text-gray-400">
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
