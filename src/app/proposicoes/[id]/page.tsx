/**
 * Página de detalhe de uma proposição.
 * Exibe todos os dados capturados da API da Câmara Federal:
 * ementa, autor real, regime, apreciação, keywords da API e histórico completo de tramitação.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { AISummary } from "@/components/AISummary";
import {
  ArrowLeft, ExternalLink, User, Calendar,
  Building2, GitBranch, Tag, Scale, Info, FileText,
} from "lucide-react";
import {
  cn, formatDate, formatDateTime,
  getProposicaoColor, getCasaColor, getCasaLabel, formatProposicao,
} from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProposicao(id: string) {
  return prisma.proposicao.findUnique({
    where: { id },
    include: {
      keywords: { include: { keyword: { select: { id: true, text: true } } } },
      tramitacoes: { orderBy: { sequencia: "desc" } },
    },
  });
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const p = await getProposicao(id);
  if (!p) return { title: "Proposição não encontrada" };
  return {
    title: `${p.siglaTipo} ${p.numero}/${p.ano} — Legisla Monitor`,
    description: p.ementa.slice(0, 160),
  };
}

export default async function ProposicaoPage({ params }: PageProps) {
  const { id } = await params;
  const proposicao = await getProposicao(id);
  if (!proposicao) notFound();

  const {
    siglaTipo, numero, ano, ementa, ementaDetalhada,
    descricaoTipo, keywordsApi,
    autor, autorUri, dataApresentacao,
    casa, urlOriginal, status, orgaoStatus,
    regime, apreciacao, codSituacao,
    aiSummary, keywords, tramitacoes,
  } = proposicao;

  const codigo = formatProposicao(siglaTipo, numero, ano);

  // Keywords da API — separadas por vírgula, ponto ou underline
  const apiKeywords = keywordsApi
    ? keywordsApi.split(/[,._]/).map((k) => k.trim()).filter((k) => k.length > 2)
    : [];

  return (
    <div className="flex flex-col flex-1">
      {/* Barra de retorno */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-200 px-8 py-3">
        <Link href="/proposicoes" className="btn-ghost text-xs">
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para proposições
        </Link>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto w-full space-y-6">

        {/* ─── Cabeçalho ──────────────────────────────────────────────────── */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={cn("badge", getProposicaoColor(siglaTipo))}>
              {descricaoTipo ?? siglaTipo}
            </span>
            <span className={cn("badge", getCasaColor(casa as "federal" | "poa"))}>
              {getCasaLabel(casa as "federal" | "poa")}
            </span>
            {keywords.map(({ keyword }) => (
              <span key={keyword.id} className="badge bg-gray-100 text-gray-600 border-gray-200">
                {keyword.text}
              </span>
            ))}
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-3">{codigo}</h1>
          <p className="text-gray-600 leading-relaxed text-sm">
            {ementaDetalhada || ementa}
          </p>

          {/* Metadados em grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 mt-6 pt-5 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <User className="w-3 h-3" /> Autor
              </p>
              {autorUri ? (
                <a
                  href={autorUri.replace(
                    "dadosabertos.camara.leg.br/api/v2/deputados",
                    "www.camara.leg.br/deputados"
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {autor}
                </a>
              ) : (
                <p className="text-sm font-medium text-gray-900">{autor}</p>
              )}
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Apresentado em
              </p>
              <p className="text-sm font-medium text-gray-900">
                {formatDate(dataApresentacao)}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Casa
              </p>
              <p className="text-sm font-medium text-gray-900">
                {getCasaLabel(casa as "federal" | "poa")}
              </p>
            </div>

            {regime && (
              <div className="col-span-2 sm:col-span-1">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Scale className="w-3 h-3" /> Regime de tramitação
                </p>
                <p className="text-sm font-medium text-gray-900">{regime}</p>
              </div>
            )}

            {apreciacao && (
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Apreciação
                </p>
                <p className="text-sm font-medium text-gray-900">{apreciacao}</p>
              </div>
            )}
          </div>

          {/* Status + link */}
          <div className="flex items-start justify-between gap-4 mt-5 pt-5 border-t border-gray-100">
            <div>
              <p className="text-xs text-gray-400 mb-1">Status atual</p>
              <div className="flex items-center gap-2 flex-wrap">
                {orgaoStatus && (
                  <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {orgaoStatus}
                  </span>
                )}
                <p className="text-sm font-medium text-gray-800">{status}</p>
                {codSituacao && (
                  <span className="text-xs text-gray-400">#{codSituacao}</span>
                )}
              </div>
            </div>
            <a
              href={urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver inteiro teor
            </a>
          </div>

          {/* Keywords da API da Câmara */}
          {apiKeywords.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" />
                Classificação temática (Câmara Federal)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {apiKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="badge bg-green-50 text-green-700 border-green-200 text-[11px]"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Resumo por IA ────────────────────────────────────────────── */}
        <AISummary proposicaoId={id} initialSummary={aiSummary} />

        {/* ─── Tramitação ───────────────────────────────────────────────── */}
        {tramitacoes.length > 0 ? (
          <section className="card">
            <h2 className="text-sm font-semibold text-gray-800 mb-5 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-gray-400" />
              Histórico de tramitação
              <span className="badge bg-gray-100 text-gray-500 border-gray-200 ml-1">
                {tramitacoes.length} etapa{tramitacoes.length !== 1 ? "s" : ""}
              </span>
            </h2>

            <ol className="relative border-l-2 border-green-100 ml-3 space-y-5">
              {tramitacoes.map((t, idx) => (
                <li key={t.id} className="ml-6">
                  <span
                    className={cn(
                      "absolute -left-[9px] w-4 h-4 rounded-full border-2 border-white",
                      idx === 0
                        ? "bg-green-500 shadow-sm shadow-green-200"
                        : "bg-gray-300"
                    )}
                  />

                  <div className="space-y-1.5">
                    {/* Ação + órgão + data */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {t.orgao}
                      </span>
                      <span
                        className={cn(
                          "text-sm font-medium",
                          idx === 0 ? "text-green-700" : "text-gray-700"
                        )}
                      >
                        {t.descricaoTramitacao}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                        {formatDateTime(t.data)}
                      </span>
                    </div>

                    {/* Status resultante */}
                    <p className="text-xs text-gray-500">
                      <span className="font-medium">Situação:</span>{" "}
                      {t.descricaoSituacao}
                    </p>

                    {/* Despacho completo */}
                    {t.despacho && (
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2.5 leading-relaxed border border-gray-100">
                        {t.despacho}
                      </p>
                    )}

                    {/* Link para o documento */}
                    {t.urlDocumento && (
                      <a
                        href={t.urlDocumento}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        Ver documento desta etapa
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          casa === "federal" && (
            <div className="card border-dashed text-center py-6">
              <GitBranch className="w-6 h-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Tramitação ainda não carregada</p>
              <p className="text-xs text-gray-400 mt-1">
                Execute o monitor para buscar o histórico desta proposição.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
