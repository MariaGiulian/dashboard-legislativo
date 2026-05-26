import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateKeyword } from "@/lib/utils";

/** GET /api/keywords — lista todas as keywords ativas */
export async function GET() {
  const keywords = await prisma.keyword.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { proposicoes: true } } },
  });

  return NextResponse.json({ data: keywords });
}

/** POST /api/keywords — adiciona uma nova keyword */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const text = String(body.text ?? "").trim();

    const error = validateKeyword(text);
    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const keyword = await prisma.keyword.upsert({
      where: { text },
      update: { active: true },
      create: { text },
    });

    return NextResponse.json({ data: keyword }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar keyword", details: String(error) },
      { status: 500 }
    );
  }
}
