/**
 * Página de votações próximas e recentes.
 */

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { VotacaoCard } from "@/components/VotacaoCard";
import { Vote, Clock } from "lucide-react";
import type { Votacao } from "@/types";

export const revalidate = 300;

async function getVotacoes() {
  const agora = new Date();
  const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);
  const ha7dias = new Date(agora.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [proximas, recentes] = await Promise.all([
    prisma.votacao.findMany({
      where: { dataHora: { gte: agora } },
      orderBy: { dataHora: "asc" },
      take: 20,
    }),
    prisma.votacao.findMany({
      where: { dataHora: { gte: ha7dias, lt: agora } },
      orderBy: { dataHora: "desc" },
      take: 20,
    }),
  ]);

  return {
    proximas: proximas as unknown as Votacao[],
    recentes: recentes as unknown as Votacao[],
    totalProximas: proximas.length,
    embreve: proximas.filter(
      (v) => new Date(v.dataHora) <= em48h
    ).length,
  };
}

export default async function VotacoesPage() {
  const { proximas, recentes, embreve } = await getVotacoes();

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Votações"
        subtitle={
          embreve > 0
            ? `${embreve} votação${embreve > 1 ? "ões" : ""} nas próximas 48h`
            : "Acompanhe votações na Câmara Federal"
        }
      />

      <div className="flex-1 px-8 py-6 space-y-8 max-w-4xl">

        {/* Alertas de votações iminentes */}
        {embreve > 0 && (
          <div className="card border-amber-500/30 bg-amber-500/5">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <p className="text-sm font-medium text-amber-300">
                {embreve === 1
                  ? "1 votação nas próximas 48 horas"
                  : `${embreve} votações nas próximas 48 horas`}
              </p>
            </div>
            <p className="text-xs text-amber-500/80">
              Veja abaixo as votações agendadas que estão próximas.
            </p>
          </div>
        )}

        {/* Próximas votações */}
        <section>
          <h2 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
            <Vote className="w-4 h-4 text-slate-500" />
            Próximas votações
          </h2>

          {proximas.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger">
              {proximas.map((v) => (
                <VotacaoCard key={v.id} votacao={v} />
              ))}
            </div>
          ) : (
            <div className="card border-dashed text-center py-8">
              <Vote className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-sm text-slate-500">Nenhuma votação agendada</p>
              <p className="text-xs text-slate-600 mt-1">
                Execute o monitor para buscar votações próximas
              </p>
            </div>
          )}
        </section>

        {/* Votações recentes */}
        {recentes.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-slate-300 mb-3">
              Realizadas nos últimos 7 dias
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger">
              {recentes.map((v) => (
                <VotacaoCard key={v.id} votacao={v} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
