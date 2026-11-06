import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { getPoolConfig } from "./postgres.js";

const globalForPrisma = globalThis as typeof globalThis & {
  billeteraPrisma?: PrismaClient;
};

export function getPrismaClient(): PrismaClient {
  if (globalForPrisma.billeteraPrisma) {
    return globalForPrisma.billeteraPrisma;
  }

  const adapter = new PrismaPg(getPoolConfig(), { schema: "billetera" });
  const prisma = new PrismaClient({ adapter });
  globalForPrisma.billeteraPrisma = prisma;
  return prisma;
}

export async function closePrismaClient(): Promise<void> {
  const prisma = globalForPrisma.billeteraPrisma;
  if (!prisma) return;
  delete globalForPrisma.billeteraPrisma;
  await prisma.$disconnect();
}
