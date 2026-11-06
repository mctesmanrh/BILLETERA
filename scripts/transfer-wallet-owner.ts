import { mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute } from "node:path";
import { closePrismaClient, getPrismaClient } from "../src/server/prisma.js";

function requiredEmail(name: string): string {
  const value = (process.env[name] || "").trim().toLowerCase();
  if (!value) throw new Error(`${name} es obligatorio.`);
  return value;
}

function backupPathFromArguments(): string | undefined {
  const argument = process.argv.find((value) => value.startsWith("--backup="));
  return argument?.slice("--backup=".length).trim() || undefined;
}

function jsonWithBigInts(value: unknown): string {
  return JSON.stringify(
    value,
    (_key, item) => (typeof item === "bigint" ? item.toString() : item),
    2,
  );
}

async function main(): Promise<void> {
  const sourceEmail = requiredEmail("BILLETERA_SOURCE_EMAIL");
  const targetEmail = requiredEmail("BILLETERA_TARGET_EMAIL");
  const apply = process.argv.includes("--apply");
  const production = process.argv.includes("--production");
  const backupPath = backupPathFromArguments();

  if (sourceEmail === targetEmail) {
    throw new Error("Las cuentas de origen y destino deben ser distintas.");
  }
  if (production && process.env.VERCEL_ENV !== "production") {
    throw new Error(
      "La confirmación --production exige variables de Vercel Production.",
    );
  }
  if (apply && (!backupPath || !isAbsolute(backupPath))) {
    throw new Error("--apply exige --backup con una ruta absoluta.");
  }

  const prisma = getPrismaClient();
  const [sourceUser, targetUser] = await Promise.all([
    prisma.user.findFirst({
      where: { email: { equals: sourceEmail, mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    }),
    prisma.user.findFirst({
      where: { email: { equals: targetEmail, mode: "insensitive" } },
      select: { id: true, name: true, email: true },
    }),
  ]);
  if (!sourceUser) throw new Error("No existe la cuenta Auth.js de origen.");
  if (!targetUser) throw new Error("No existe la cuenta Auth.js de destino.");

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      select 1 as locked
      from (
        select pg_advisory_xact_lock(hashtext('tu-billetera-wallet-ownership'))
      ) as wallet_ownership_lock
    `;

    const [sourceSettings, targetSettings, sourceExpenses, targetExpenses,
      sourceArchives, targetArchives] = await Promise.all([
      transaction.walletSettings.findUnique({
        where: { ownerId: sourceUser.id },
      }),
      transaction.walletSettings.findUnique({
        where: { ownerId: targetUser.id },
      }),
      transaction.expenseRecord.findMany({
        where: { ownerId: sourceUser.id },
        orderBy: [{ spentOn: "asc" }, { createdAt: "asc" }],
      }),
      transaction.expenseRecord.findMany({
        where: { ownerId: targetUser.id },
        orderBy: [{ spentOn: "asc" }, { createdAt: "asc" }],
      }),
      transaction.monthlyArchive.findMany({
        where: { ownerId: sourceUser.id },
        orderBy: { monthStart: "asc" },
      }),
      transaction.monthlyArchive.findMany({
        where: { ownerId: targetUser.id },
        orderBy: { monthStart: "asc" },
      }),
    ]);

    if (!sourceSettings) {
      throw new Error("La cuenta de origen no tiene una billetera para transferir.");
    }
    if (targetExpenses.length > 0 || targetArchives.length > 0) {
      throw new Error(
        "La cuenta destino ya contiene gastos o informes; no se mezclaron billeteras.",
      );
    }

    const summary = {
      status: apply ? "transferred" : "dry-run",
      source: sourceEmail,
      target: targetEmail,
      expenses: sourceExpenses.length,
      archives: sourceArchives.length,
      targetHadEmptySettings: Boolean(targetSettings),
    };
    if (!apply) return summary;

    await mkdir(dirname(backupPath!), { recursive: true });
    await writeFile(
      backupPath!,
      jsonWithBigInts({
        createdAt: new Date().toISOString(),
        sourceUser,
        targetUser,
        source: {
          settings: sourceSettings,
          expenses: sourceExpenses,
          archives: sourceArchives,
        },
        target: {
          settings: targetSettings,
          expenses: targetExpenses,
          archives: targetArchives,
        },
      }),
      { encoding: "utf8", flag: "wx", mode: 0o600 },
    );

    if (targetSettings) {
      await transaction.walletSettings.delete({
        where: { id: targetSettings.id },
      });
    }
    await transaction.walletSettings.update({
      where: { id: sourceSettings.id },
      data: { ownerId: targetUser.id, updatedAt: new Date() },
    });
    const movedExpenses = await transaction.expenseRecord.updateMany({
      where: { ownerId: sourceUser.id },
      data: { ownerId: targetUser.id },
    });
    const movedArchives = await transaction.monthlyArchive.updateMany({
      where: { ownerId: sourceUser.id },
      data: { ownerId: targetUser.id },
    });
    if (
      movedExpenses.count !== sourceExpenses.length ||
      movedArchives.count !== sourceArchives.length
    ) {
      throw new Error("La cantidad transferida cambió durante la transacción.");
    }

    return { ...summary, backupPath };
  }, { maxWait: 5_000, timeout: 30_000 });

  console.log(JSON.stringify(result));
}

try {
  await main();
} finally {
  await closePrismaClient();
}
