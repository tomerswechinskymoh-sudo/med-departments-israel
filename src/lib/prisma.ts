import { PrismaClient } from "@prisma/client";

type PrismaLogOption = NonNullable<ConstructorParameters<typeof PrismaClient>[0]>["log"];

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const prismaLog = (
  process.env.NEON_TRANSFER_DIAGNOSTICS === "1"
    ? [
        { emit: "event", level: "query" }
      ]
    : process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"]
) as PrismaLogOption;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLog
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
