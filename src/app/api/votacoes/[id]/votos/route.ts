import { NextRequest, NextResponse } from "next/server";
import { buscarVotosDeVotacao, calcularPlacar } from "@/lib/api/camara-federal";

/** GET /api/votacoes/[id]/votos — retorna placar de uma votação */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const votos = await buscarVotosDeVotacao(id);
  const placar = calcularPlacar(votos);

  return NextResponse.json(
    { placar, total: votos.length },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
