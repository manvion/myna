import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development"
      ? [{ emit: "event", level: "query" }, "info", "warn", "error"]
      : ["warn", "error"],
  });

if (process.env.NODE_ENV === "development") {
  (prisma as any).$on("query", (e: any) => {
    logger.debug(`Prisma query: ${e.query} | ${e.duration}ms`);
  });
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
