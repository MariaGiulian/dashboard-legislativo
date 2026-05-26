import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** GET /api/notifications — lista notificações */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const somenteNaoLidas = searchParams.get("nao_lidas") === "true";

  const notifications = await prisma.notification.findMany({
    where: somenteNaoLidas ? { read: false } : undefined,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      proposicao: {
        select: { id: true, siglaTipo: true, numero: true, ano: true },
      },
    },
  });

  return NextResponse.json({ data: notifications });
}

/** PATCH /api/notifications — marca notificação como lida */
export async function PATCH(req: NextRequest) {
  try {
    const { id } = await req.json();

    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json({ error: "Notificação não encontrada" }, { status: 404 });
  }
}

/** DELETE /api/notifications — marca todas como lidas */
export async function DELETE() {
  await prisma.notification.updateMany({
    where: { read: false },
    data: { read: true },
  });

  return NextResponse.json({ data: { success: true } });
}
