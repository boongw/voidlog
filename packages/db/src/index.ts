import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var __voidlogPrisma: PrismaClient | undefined;
}

/**
 * Singleton PrismaClient, reused across hot reloads in dev so we don't
 * exhaust the Postgres connection pool.
 */
export const prisma = globalThis.__voidlogPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__voidlogPrisma = prisma;
}

export * from "@prisma/client";
