import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/proposicoes — lista proposições com filtros opcionais */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const keyword = searchParams.get("keyword") ?? undefined;
  const casa = searchParams.get("casa") ?? undefined;
  const tipo = searchParams.get("tipo") ?? undefined;
  const pagina = Math.max(1, parseInt(searchParams.get("pagina") ?? "1", 10));
  const por = Math.min(50, Math.max(1, parseInt(searchParams.get("por") ?? "20", 10)));

  const where: Record<string, unknown> = {};

  if (keyword) {
    where.keywords = { some: { keyword: { text: { contains: keyword } } } };
  }
  if (casa === "federal" || casa === "poa") {
    where.casa = casa;
  }
  if (tipo) {
    where.siglaTipo = tipo;
  }

  const [data, total] = await Promise.all([
    prisma.proposicao.findMany({
      where,
      take: por,
      skip: (pagina - 1) * por,
      orderBy: { dataApresentacao: "desc" },
      include: {
        keywords: { include: { keyword: { select: { id: true, text: true } } } },
      },
    }),
    prisma.proposicao.count({ where }),
  ]);

  return NextResponse.json({
    data,
    meta: { total, pagina, por, paginas: Math.ceil(total / por) },
  });
}
