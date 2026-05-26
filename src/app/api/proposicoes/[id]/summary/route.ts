import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { gerarResumoPL } from "@/lib/ai/summarizer";
import type { Proposicao } from "@/types";

/**
 * POST /api/proposicoes/:id/summary
 *
 * Gera (ou regenera) um resumo por IA para a proposição.
 * Salva o resultado no banco para evitar chamadas repetidas à API.
 *
 * Retorna 503 se ANTHROPIC_API_KEY não estiver configurada.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "IA não configurada. Adicione ANTHROPIC_API_KEY ao .env.local" },
      { status: 503 }
    );
  }

  const proposicao = await prisma.proposicao.findUnique({ where: { id } });

  if (!proposicao) {
    return NextResponse.json({ error: "Proposição não encontrada" }, { status: 404 });
  }

  const summary = await gerarResumoPL(proposicao as unknown as Proposicao);

  if (!summary) {
    return NextResponse.json(
      { error: "Não foi possível gerar o resumo" },
      { status: 500 }
    );
  }

  // Persiste para não rechamar a API desnecessariamente
  await prisma.proposicao.update({
    where: { id },
    data: { aiSummary: summary },
  });

  return NextResponse.json({ data: { summary } });
}
