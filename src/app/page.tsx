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
  AlertCircle,
  Wifi,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { DashboardStats, Notification, Proposicao } from "@/types";

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
    dbOk: true,
  };
}

const emptyStats: DashboardStats = {
  totalProposicoes: 0,
  novasHoje: 0,
  notificacoesNaoLidas: 0,
  votacoesProximas: 0,
  keywordsAtivas: 0,
  proposicoesFederal: 0,
  proposicoesPOA: 0,
};

export default async function DashboardPage() {
  const { stats, notificacoesRecentes, proposicoesRecentes, dbOk } =
    await getDashboardData().catch(() => ({
      stats: emptyStats,
      notificacoesRecentes: [] as Notification[],
      proposicoesRecentes: [] as Proposicao[],
      dbOk: false,
    }));

  const isEmpty = stats.totalProposicoes === 0 && stats.keywordsAtivas === 0;

  return (
    <div className="flex flex-col flex-1">
      <Header
        title="Dashboard"
        subtitle={`Atualizado em ${formatDate(new Date())}`}
        unreadCount={stats.notificacoesNaoLidas}
      />

      <div className="flex-1 px-8 py-6 space-y-8">

        {/* Aviso: banco não configurado */}
        {!dbOk && (
          <div className="card border-amber-300 bg-amber-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  Banco de dados não configurado
                </p>
                <p className="text-xs text-amber-700 leading-relaxed mb-2">
                  Adicione a URL do PostgreSQL (Railway) no arquivo{" "}
                  <code className="bg-amber-100 px-1 rounded">.env.local</code>:
                </p>
                <pre className="text-xs bg-amber-100 border border-amber-200 rounded p-2 text-amber-900 overflow-x-auto">
                  DATABASE_URL=&quot;postgresql://user:pass@host:port/db&quot;{"\n"}
                  DIRECT_URL=&quot;postgresql://user:pass@host:port/db&quot;
                </pre>
                <p className="text-xs text-amber-600 mt-2">
                  Enquanto isso, você já pode usar{" "}
                  <a href="/deputados" className="underline font-medium">Deputados</a> e{" "}
                  <a href="/proposicoes?modo=direto" className="underline font-medium">Consulta direta à Câmara</a>{" "}
                  — essas páginas não dependem do banco.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Acesso rápido às páginas ao vivo (sempre visível) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/deputados"
            className="card border-blue-200 bg-blue-50 hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3 py-4"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Deputados Federais</p>
              <p className="text-xs text-gray-500">Lista por estado e partido — ao vivo</p>
            </div>
          </a>
          <a
            href="/proposicoes?modo=direto"
            className="card border-green-200 bg-green-50 hover:border-green-300 hover:shadow-md transition-all flex items-center gap-3 py-4"
          >
            <div className="w-10 h-10 rounded-lg bg-green-100 border border-green-200 flex items-center justify-center flex-shrink-0">
              <Wifi className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Consulta à Câmara</p>
              <p className="text-xs text-gray-500">Busca direta nos dados abertos — ao vivo</p>
            </div>
          </a>
        </section>

        {/* Estado vazio com banco ok — orientação inicial */}
        {dbOk && isEmpty && (
          <div className="card border-blue-200 bg-blue-50 text-center py-10">
            <Tag className="w-12 h-12 text-blue-400 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-800 mb-1">
              Bem-vindo ao Legisla Monitor!
            </h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto mb-4">
              Adicione temas para começar a monitorar proposições. Acesse{" "}
              <strong className="text-blue-600">Meus Temas</strong> e adicione
              palavras-chave como "inteligência artificial" ou "proteção de dados".
            </p>
            <a href="/temas" className="btn-primary inline-flex">
              <Tag className="w-4 h-4" />
              Configurar temas
            </a>
          </div>
        )}

        {/* Estatísticas — só mostra quando banco está ok */}
        {dbOk && (
          <section>
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
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
        )}

        {/* Distribuição por casa */}
        {dbOk && stats.totalProposicoes > 0 && (
          <section className="card">
            <h3 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" />
              Por casa legislativa
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-federal" />
                    Câmara Federal
                  </span>
                  <span className="text-gray-700 font-medium">{stats.proposicoesFederal}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
              <div className="flex-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-poa" />
                    Câmara POA
                  </span>
                  <span className="text-gray-700 font-medium">{stats.proposicoesPOA}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
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
        {dbOk && stats.totalProposicoes > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gray-400" />
                  Notificações recentes
                  {stats.notificacoesNaoLidas > 0 && (
                    <span className="badge bg-blue-600 text-white border-blue-600 text-[10px]">
                      {stats.notificacoesNaoLidas}
                    </span>
                  )}
                </h3>
                <a href="/api/notifications" className="text-xs text-gray-400 hover:text-gray-600">
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
                  <Bell className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs text-gray-400">Nenhuma notificação ainda</p>
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                  Proposições recentes
                </h3>
                <a href="/proposicoes" className="text-xs text-gray-400 hover:text-gray-600">
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

        <RefreshDashboard />
      </div>
    </div>
  );
}
