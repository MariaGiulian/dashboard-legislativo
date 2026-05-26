import { PrismaClient } from "@prisma/client";

/**
 * Singleton do Prisma Client para evitar múltiplas conexões em desenvolvimento.
 *
 * Em desenvolvimento, o Next.js recarrega os módulos com hot reload, o que
 * criaria uma nova instância do PrismaClient a cada reload — exaurindo o pool.
 * O padrão abaixo salva a instância no objeto global do Node.js.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
