import { PrismaClient } from "@prisma/client";

/**
 * Prisma Client singleton — otimizado para Vercel serverless (Fluid Compute).
 *
 * Problema de hot reload em dev:
 *   O Next.js recarrega módulos com HMR, criando uma nova instância do
 *   PrismaClient a cada reload e esgotando o pool de conexões.
 *   Solução: salva a instância no objeto `globalThis` em desenvolvimento.
 *
 * Problema de serverless em produção (Vercel):
 *   Funções serverless abrem e fecham rapidamente, criando muitas conexões
 *   simultâneas no banco. O Prisma abre até 10 conexões por instância por padrão.
 *   Com Fluid Compute da Vercel, instâncias são reutilizadas entre requisições,
 *   mas ainda é importante limitar o pool.
 *
 *   Recomendação: use a DATABASE_URL do Railway com ?connection_limit=5
 *   Ex: postgresql://user:pass@host:port/db?connection_limit=5
 */

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]  // remove "query" em dev para não poluir o console
        : ["error"],
  });

// Em desenvolvimento, persiste no global para sobreviver ao hot reload
if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}
