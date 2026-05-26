import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** DELETE /api/keywords/:id — desativa uma keyword */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await prisma.keyword.update({
      where: { id },
      data: { active: false },
    });

    return NextResponse.json({ data: { success: true } });
  } catch {
    return NextResponse.json(
      { error: "Keyword não encontrada" },
      { status: 404 }
    );
  }
}
