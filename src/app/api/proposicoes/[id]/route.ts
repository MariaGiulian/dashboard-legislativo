import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/proposicoes/:id — retorna proposição com tramitações */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const proposicao = await prisma.proposicao.findUnique({
    where: { id },
    include: {
      keywords: { include: { keyword: { select: { id: true, text: true } } } },
      tramitacoes: { orderBy: { sequencia: "desc" } },
    },
  });

  if (!proposicao) {
    return NextResponse.json({ error: "Proposição não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: proposicao });
}
