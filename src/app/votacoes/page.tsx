/**
 * Página de votações — próximas e realizadas com análise de placar.
 * Cada card de votação realizada permite expandir o resultado (Sim/Não/Abstenção).
 */

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { VotacaoCard } from "@/components/VotacaoCard";
import { Vote, Clock, TrendingUp, CheckCircle, XCircle, AlertCircle, Wifi } from "lucide-react";
import type { Votacao } from "@/types";

export const revalidate = 300;

async function getVotacoes() {
  const agora = new Date();
  const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);
  const ha30dias = new Date(agora.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [proximas, recentes] = await Promise.all([
    prisma.votacao.findMany({
      where: { dataHora: { gte: agora } },
      orderBy: { dataHora: "asc" },
      take: 20,
    }),
    prisma.votacao.findMany({
      where: { dataHora: { gte: ha30dias, lt: agora } },
      orderBy: { dataHora: "desc" },
      take: 30,
    }),
  ]);

  const aprovadas = recentes.filter((v) => v.resultado === "Aprovada").length;
  const rejeitadas = recentes.filter((v) => v.resultado === "Rejeitada").length;

  return {
    proximas: proximas as unknown as Votacao[],
    recentes: recentes as unknown as Votacao[],
    embreve: proximas.filter((v) => new Date(v.dataHora) <= em48h).length,
    totalRecentes: recentes.length,
    aprovadas,
    rejeitadas,
    dbOk: true,
  };
}

export default async function VotacoesPage() {
  const { proximas, recentes, embreve, totalRecentes, aprovadas, rejeitadas, dbOk } =
    await getVotacoes().catch(() => ({
      proximas: [] as Votacao[],
      recentes: [] as Votacao[],
      embreve: 0,
      totalRecentes: 0,
      aprovadas: 0,
      rejeitadas: 0,
      dbOk: false,
    }));

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Votações"
        subtitle={
          embreve > 0
            ? `${embreve} votação${embreve > 1 ? "ões" : ""} nas próximas 48h`
            : "Acompanhe e analise votações na Câmara Federal"
        }
      />

      <div className="flex-1 px-8 py-6 space-y-8 max-w-5xl">

        {/* Aviso: banco não configurado */}
        {!dbOk && (
          <div className="card border-amber-300 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  Banco de dados não configurado
                </p>
                <p className="text-xs text-amber-700">
                  As votações são armazenadas no banco. Configure{" "}
                  <code className="bg-amber-100 px-1 rounded">DATABASE_URL</code> no{" "}
                  <code className="bg-amber-100 px-1 rounded">.env.local</code> para visualizar dados.
                </p>
                <a
                  href="/proposicoes?modo=direto"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline"
                >
                  <Wifi className="w-3 h-3" />
                  Consultar proposições diretamente na Câmara →
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Aviso de votações iminentes */}
        {embreve > 0 && (
          <div className="card border-amber-300 bg-amber-50">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-medium text-amber-700">
                {embreve === 1
                  ? "1 votação nas próximas 48 horas"
                  : `${embreve} votações nas próximas 48 horas`}
              </p>
            </div>
            <p className="text-xs text-amber-600">
              Veja abaixo as votações agendadas que estão próximas.
            </p>
          </div>
        )}

        {/* Resumo das últimas 4 semanas */}
        {totalRecentes > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              Resumo — últimos 30 dias
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div className="card text-center py-4">
                <p className="text-2xl font-bold text-gray-900">{totalRecentes}</p>
                <p className="text-xs text-gray-500 mt-1">Votações realizadas</p>
              </div>
              <div className="card text-center py-4 border-green-200 bg-green-50">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-2xl font-bold text-green-700">{aprovadas}</p>
                </div>
                <p className="text-xs text-green-600">Aprovadas</p>
              </div>
              <div className="card text-center py-4 border-red-200 bg-red-50">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <p className="text-2xl font-bold text-red-700">{rejeitadas}</p>
                </div>
                <p className="text-xs text-red-600">Rejeitadas</p>
              </div>
            </div>
          </section>
        )}

        {/* Próximas votações */}
        <section>
          <h2 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Vote className="w-4 h-4 text-gray-400" />
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
              <Vote className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nenhuma votação agendada</p>
              <p className="text-xs text-gray-400 mt-1">
                Execute o monitor para buscar votações próximas
              </p>
            </div>
          )}
        </section>

        {/* Votações recentes com análise */}
        {recentes.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-gray-700 mb-1">
              Realizadas nos últimos 30 dias
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Clique em "Analisar votos" para ver o placar (Sim / Não / Abstenção)
            </p>
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
