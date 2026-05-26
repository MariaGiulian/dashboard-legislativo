/**
 * Página de detalhe de uma proposição.
 * Mostra ementa completa, tramitação, links e resumo por IA.
 */

import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { AISummary } from "@/components/AISummary";
import {
  ArrowLeft,
  ExternalLink,
  User,
  Calendar,
  Building2,
  GitBranch,
} from "lucide-react";
import {
  cn,
  formatDate,
  formatDateTime,
  getProposicaoColor,
  getCasaColor,
  getCasaLabel,
  formatProposicao,
} from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProposicao(id: string) {
  const proposicao = await prisma.proposicao.findUnique({
    where: { id },
    include: {
      keywords: { include: { keyword: { select: { id: true, text: true } } } },
      tramitacoes: { orderBy: { sequencia: "desc" } },
    },
  });

  return proposicao;
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
    siglaTipo,
    numero,
    ano,
    ementa,
    ementaDetalhada,
    autor,
    dataApresentacao,
    casa,
    urlOriginal,
    status,
    orgaoStatus,
    aiSummary,
    keywords,
    tramitacoes,
  } = proposicao;

  const codigo = formatProposicao(siglaTipo, numero, ano);

  return (
    <div className="flex flex-col flex-1">
      {/* Header com voltar */}
      <div className="sticky top-0 z-10 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800 px-8 py-4">
        <Link
          href="/proposicoes"
          className="btn-ghost text-xs inline-flex mb-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar para proposições
        </Link>
      </div>

      <div className="px-8 py-6 max-w-4xl mx-auto w-full space-y-6">

        {/* Cabeçalho da proposição */}
        <div className="card">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={cn("badge", getProposicaoColor(siglaTipo))}>
              {siglaTipo}
            </span>
            <span className={cn("badge", getCasaColor(casa as "federal" | "poa"))}>
              {getCasaLabel(casa as "federal" | "poa")}
            </span>
            {keywords.map(({ keyword }) => (
              <span
                key={keyword.id}
                className="badge bg-slate-700 text-slate-300 border-slate-600"
              >
                {keyword.text}
              </span>
            ))}
          </div>

          <h1 className="text-xl font-bold text-slate-100 mb-1">{codigo}</h1>

          <p className="text-slate-300 leading-relaxed text-sm">
            {ementaDetalhada || ementa}
          </p>

          {/* Metadados */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-700">
            <div>
              <p className="text-xs text-slate-500 mb-1">Autor</p>
              <p className="text-sm text-slate-200 font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                {autor}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Apresentado em</p>
              <p className="text-sm text-slate-200 font-medium flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {formatDate(dataApresentacao)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 mb-1">Casa legislativa</p>
              <p className="text-sm text-slate-200 font-medium flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {getCasaLabel(casa as "federal" | "poa")}
              </p>
            </div>
          </div>

          {/* Status e link */}
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-700">
            <div>
              <p className="text-xs text-slate-500">Status atual</p>
              <p className="text-sm text-slate-200 mt-0.5">
                {orgaoStatus && (
                  <span className="font-mono text-slate-500 mr-2">{orgaoStatus}</span>
                )}
                {status}
              </p>
            </div>
            <a
              href={urlOriginal}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver original
            </a>
          </div>
        </div>

        {/* Resumo por IA */}
        <AISummary
          proposicaoId={id}
          initialSummary={aiSummary}
        />

        {/* Tramitação */}
        {tramitacoes.length > 0 && (
          <section className="card">
            <h2 className="text-sm font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-slate-500" />
              Histórico de tramitação
            </h2>

            <ol className="relative border-l border-slate-700 ml-2 space-y-4">
              {tramitacoes.map((t, idx) => (
                <li key={t.id} className="ml-5">
                  {/* Marcador da linha do tempo */}
                  <span
                    className={cn(
                      "absolute -left-1.5 w-3 h-3 rounded-full border-2 border-slate-900",
                      idx === 0 ? "bg-blue-500" : "bg-slate-600"
                    )}
                  />
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-mono text-slate-500">
                        {t.orgao}
                      </span>
                      <span className="text-xs text-slate-600">
                        {formatDateTime(t.data)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {t.descricao}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
}
