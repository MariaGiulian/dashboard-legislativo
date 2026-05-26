/**
 * Dashboard — página inicial do Legisla Monitor
 *
 * Exibe estatísticas gerais, feed de notificações recentes
 * e acesso rápido às funcionalidades principais.
 */

import { prisma } from "@/lib/db";
import { Header } from "@/components/layout/Header";
import { StatsCard } from "@/components/StatsCard";
import { NotificationItem } from "@/components/NotificationItem";
import { ProposicaoCard } from "@/components/ProposicaoCard";
import { RefreshDashboard } from "./RefreshDashboard";
import {
  Bell,
  BookOpen,
  Tag,
  Vote,
  TrendingUp,
  Building2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { DashboardStats, Notification, Proposicao } from "@/types";

// Revalida a página a cada 5 minutos para mostrar dados atualizados
export const revalidate = 300;

async function getDashboardData() {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [
    totalProposicoes,
    novasHoje,
    notificacoesNaoLidas,
    votacoesProximas,
    keywordsAtivas,
    proposicoesFederal,
    proposicoesPOA,
    notificacoesRecentes,
    proposicoesRecentes,
  ] = await Promise.all([
    prisma.proposicao.count(),
    prisma.proposicao.count({ where: { createdAt: { gte: hoje } } }),
    prisma.notification.count({ where: { read: false } }),
    prisma.votacao.count({ where: { dataHora: { gte: new Date() } } }),
    prisma.keyword.count({ where: { active: true } }),
    prisma.proposicao.count({ where: { casa: "federal" } }),
    prisma.proposicao.count({ where: { casa: "poa" } }),
    prisma.notification.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        proposicao: {
          select: { id: true, siglaTipo: true, numero: true, ano: true },
        },
      },
    }),
    prisma.proposicao.findMany({
      take: 6,
      orderBy: { createdAt: "desc" },
      include: {
        keywords: { include: { keyword: { select: { id: true, text: true } } } },
      },
    }),
  ]);

  const stats: DashboardStats = {
    totalProposicoes,
    novasHoje,
    notificacoesNaoLidas,
    votacoesProximas,
    keywordsAtivas,
    proposicoesFederal,
    proposicoesPOA,
  };

  return {
    stats,
    notificacoesRecentes: notificacoesRecentes as unknown as Notification[],
    proposicoesRecentes: proposicoesRecentes as unknown as Proposicao[],
  };
}

export default async function DashboardPage() {
  const { stats, notificacoesRecentes, proposicoesRecentes } =
    await getDashboardData();

  const isEmpty = stats.totalProposicoes === 0 && stats.keywordsAtivas === 0;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle={`Atualizado em ${formatDate(new Date())}`}
        unreadCount={stats.notificacoesNaoLidas}
      />

      <div className="flex-1 px-8 py-6 space-y-8">

        {/* Estado vazio — orientação inicial */}
        {isEmpty && (
          <div className="card border-blue-500/20 bg-blue-500/5 text-center py-10">
            <Tag className="w-12 h-12 text-blue-500/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-200 mb-1">
              Bem-vindo ao Legisla Monitor!
            </h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
              Adicione temas para começar a monitorar proposições. Acesse{" "}
              <strong className="text-blue-400">Meus Temas</strong> e adicione
              palavras-chave como "inteligência artificial" ou "proteção de dados".
            </p>
            <a href="/temas" className="btn-primary inline-flex">
              <Tag className="w-4 h-4" />
              Configurar temas
            </a>
          </div>
        )}

        {/* Estatísticas */}
        <section>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">
            Visão geral
          </h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Proposições"
              value={stats.totalProposicoes}
              subtitle="total monitoradas"
              icon={BookOpen}
              color="blue"
              trend={stats.novasHoje > 0 ? { value: stats.novasHoje, label: "hoje" } : undefined}
            />
            <StatsCard
              title="Notificações"
              value={stats.notificacoesNaoLidas}
              subtitle="não lidas"
              icon={Bell}
              color={stats.notificacoesNaoLidas > 0 ? "amber" : "slate"}
            />
            <StatsCard
              title="Votações"
              value={stats.votacoesProximas}
              subtitle="próximas"
              icon={Vote}
              color={stats.votacoesProximas > 0 ? "emerald" : "slate"}
            />
            <StatsCard
              title="Temas"
              value={stats.keywordsAtivas}
              subtitle="monitorados"
              icon={Tag}
              color="purple"
            />
          </div>
        </section>

        {/* Distribuição por casa */}
        {stats.totalProposicoes > 0 && (
          <section className="card">
            <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              Por casa legislativa
            </h3>
            <div className="flex items-center gap-4">
              {/* Barra Federal */}
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-federal" />
                    Câmara Federal
                  </span>
                  <span className="text-slate-300 font-medium">{stats.proposicoesFederal}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-federal rounded-full transition-all duration-500"
                    style={{
                      width: stats.totalProposicoes > 0
                        ? `${(stats.proposicoesFederal / stats.totalProposicoes) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>

              {/* Barra POA */}
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-poa" />
                    Câmara POA
                  </span>
                  <span className="text-slate-300 font-medium">{stats.proposicoesPOA}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-poa rounded-full transition-all duration-500"
                    style={{
                      width: stats.totalProposicoes > 0
                        ? `${(stats.proposicoesPOA / stats.totalProposicoes) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Conteúdo principal: notificações + proposições recentes */}
        {stats.totalProposicoes > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Feed de notificações */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-slate-500" />
                  Notificações recentes
                  {stats.notificacoesNaoLidas > 0 && (
                    <span className="badge bg-blue-600 text-white border-blue-600 text-[10px]">
                      {stats.notificacoesNaoLidas}
                    </span>
                  )}
                </h3>
                <a href="/api/notifications" className="text-xs text-slate-500 hover:text-slate-300">
                  Ver todas
                </a>
              </div>

              {notificacoesRecentes.length > 0 ? (
                <div className="space-y-2 stagger">
                  {notificacoesRecentes.map((n) => (
                    <NotificationItem key={n.id} notification={n} />
                  ))}
                </div>
              ) : (
                <div className="card border-dashed text-center py-6">
                  <Bell className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                  <p className="text-xs text-slate-600">Nenhuma notificação ainda</p>
                </div>
              )}
            </section>

            {/* Proposições recentes */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-slate-500" />
                  Proposições recentes
                </h3>
                <a href="/proposicoes" className="text-xs text-slate-500 hover:text-slate-300">
                  Ver todas
                </a>
              </div>

              <div className="space-y-3 stagger">
                {proposicoesRecentes.map((p) => (
                  <ProposicaoCard key={p.id} proposicao={p} compact />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Botão de busca manual */}
        <RefreshDashboard />
      </div>
    </div>
  );
}
