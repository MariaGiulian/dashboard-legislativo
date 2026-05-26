import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/votacoes — retorna votações próximas e recentes */
export async function GET() {
  const agora = new Date();
  const ha7dias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

  const votacoes = await prisma.votacao.findMany({
    where: { dataHora: { gte: ha7dias } },
    orderBy: { dataHora: "asc" },
    take: 50,
  });

  return NextResponse.json({ data: votacoes });
}
