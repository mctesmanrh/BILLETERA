import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Expense } from "../src/types.js";
import { closePrismaClient, getPrismaClient } from "../src/server/prisma.js";
import {
  validateExpenseMonth,
  validateWalletSnapshot,
} from "../src/server/validation.js";

type StoredExpense = {
  id: string;
  amount: bigint;
  category: string;
  spentOn: Date;
  description: string;
  deletedAt: Date | null;
};

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function isSameExpense(stored: StoredExpense, expense: Expense): boolean {
  return (
    stored.amount === BigInt(expense.amount) &&
    stored.category === expense.category &&
    toDateString(stored.spentOn) === expense.date &&
    stored.description === expense.description &&
    stored.deletedAt === null
  );
}

function summarize(expenses: Expense[]) {
  return {
    count: expenses.length,
    total: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    firstDate:
      expenses.length > 0
        ? expenses.map((expense) => expense.date).sort()[0]
        : null,
    lastDate:
      expenses.length > 0
        ? expenses.map((expense) => expense.date).sort().at(-1)
        : null,
  };
}

async function main(): Promise<void> {
  const backupArgument = process.argv
    .slice(2)
    .find((argument) => !argument.startsWith("--"));
  const apply = process.argv.includes("--apply");
  const production = process.argv.includes("--production");
  const ownerEmail = (process.env.BILLETERA_OWNER_EMAIL || "").trim();

  if (!backupArgument) {
    throw new Error(
      "Uso: npm run db:import-expenses -- <respaldo.json> [--apply] [--production]",
    );
  }

  if (!ownerEmail) {
    throw new Error(
      "BILLETERA_OWNER_EMAIL es obligatorio para elegir la billetera de destino.",
    );
  }

  if (production && process.env.VERCEL_ENV !== "production") {
    throw new Error(
      "La confirmación --production exige variables de Vercel Production.",
    );
  }

  const backupPath = resolve(backupArgument);
  const parsed = JSON.parse(await readFile(backupPath, "utf8")) as unknown;
  const snapshot = validateWalletSnapshot(parsed);
  const prisma = getPrismaClient();
  const owner = await prisma.user.findFirst({
    where: { email: { equals: ownerEmail, mode: "insensitive" } },
    select: { id: true },
  });
  if (!owner) {
    throw new Error("No existe un usuario Auth.js para la cuenta indicada.");
  }
  const settings = await prisma.walletSettings.findUniqueOrThrow({
    where: { ownerId: owner.id },
  });
  const activeMonth = toDateString(settings.activeMonth);

  for (const expense of snapshot.expenses) {
    validateExpenseMonth(expense.date, activeMonth);
  }

  const existing = await prisma.expenseRecord.findMany({
    where: {
      ownerId: owner.id,
      id: { in: snapshot.expenses.map((expense) => expense.id) },
    },
  });
  const backupById = new Map(snapshot.expenses.map((expense) => [expense.id, expense]));
  const conflictingIds = existing
    .filter((stored) => {
      const expense = backupById.get(stored.id);
      return !expense || !isSameExpense(stored, expense);
    })
    .map((stored) => stored.id);

  if (conflictingIds.length > 0) {
    throw new Error(
      `La importación se detuvo: ${conflictingIds.length} ID ya existe con datos diferentes.`,
    );
  }

  const existingIds = new Set(existing.map((expense) => expense.id));
  const missingExpenses = snapshot.expenses.filter(
    (expense) => !existingIds.has(expense.id),
  );
  const before = await prisma.expenseRecord.aggregate({
    where: { ownerId: owner.id, deletedAt: null },
    _count: { id: true },
    _sum: { amount: true },
  });

  if (apply) {
    await prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          select 1 as locked
          from (
            select pg_advisory_xact_lock(
              hashtext('tu-billetera-wallet-import:' || ${owner.id})
            )
          ) as wallet_import_lock
        `;
        const currentSettings = await transaction.walletSettings.findUniqueOrThrow({
          where: { ownerId: owner.id },
        });
        const currentMonth = toDateString(currentSettings.activeMonth);

        if (currentMonth !== activeMonth) {
          throw new Error("El mes activo cambió durante la importación.");
        }

        if (missingExpenses.length > 0) {
          await transaction.expenseRecord.createMany({
            data: missingExpenses.map((expense) => ({
              ownerId: owner.id,
              id: expense.id,
              amount: BigInt(expense.amount),
              category: expense.category,
              spentOn: toDateOnly(expense.date),
              description: expense.description,
              deletedAt: null,
            })),
          });
        }
      },
      { maxWait: 5_000, timeout: 15_000 },
    );
  }

  const after = apply
    ? await prisma.expenseRecord.aggregate({
        where: { ownerId: owner.id, deletedAt: null },
        _count: { id: true },
        _sum: { amount: true },
      })
    : before;

  console.log(
    JSON.stringify(
      {
        mode: apply ? "applied" : "dry-run",
        target: production ? "production" : "current-environment",
        activeMonth,
        source: summarize(snapshot.expenses),
        inserted: apply ? missingExpenses.length : 0,
        wouldInsert: missingExpenses.length,
        skippedExisting: existing.length,
        ignored: {
          monthlyBudget: snapshot.monthlyBudget,
          deletedExpenses: snapshot.deletedExpenses.length,
        },
        preservedMonthlyBudget: Number(settings.monthlyBudget),
        databaseBefore: {
          count: before._count.id,
          total: Number(before._sum.amount ?? 0n),
        },
        databaseAfter: {
          count: after._count.id,
          total: Number(after._sum.amount ?? 0n),
        },
      },
      null,
      2,
    ),
  );
}

try {
  await main();
} finally {
  await closePrismaClient();
}
