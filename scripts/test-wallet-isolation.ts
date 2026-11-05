import { randomUUID } from "node:crypto";
import type { Expense, WalletOwner } from "../src/types.js";
import { closePrismaClient, getPrismaClient } from "../src/server/prisma.js";
import {
  createExpense,
  loadWalletSnapshot,
  softDeleteExpense,
  updateBudget,
  updateDisplayName,
} from "../src/server/walletRepository.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function currentColombiaDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

async function main(): Promise<void> {
  if (process.env.VERCEL || process.env.VERCEL_ENV === "production") {
    throw new Error("La prueba de aislamiento solo puede ejecutarse localmente.");
  }

  const suffix = randomUUID();
  const ownerA: WalletOwner = { id: `qa-owner-a-${suffix}`, name: "Cuenta A" };
  const ownerB: WalletOwner = { id: `qa-owner-b-${suffix}`, name: "Cuenta B" };
  const ownerIds = [ownerA.id, ownerB.id];
  const prisma = getPrismaClient();
  const date = currentColombiaDate();
  const sharedId = `qa-shared-${suffix}`;
  const privateId = `qa-private-${suffix}`;

  const expense = (id: string, amount: number): Expense => ({
    id,
    amount,
    category: "otros",
    date,
    description: "Prueba automática de aislamiento",
  });

  try {
    await Promise.all([
      loadWalletSnapshot(ownerA),
      loadWalletSnapshot(ownerB),
    ]);
    await Promise.all([
      updateDisplayName(ownerA, "BILLETERA A"),
      updateDisplayName(ownerB, "BILLETERA B"),
      updateBudget(ownerA, 1_111_111),
      updateBudget(ownerB, 2_222_222),
    ]);

    await createExpense(ownerA.id, expense(sharedId, 11_000));
    await createExpense(ownerB.id, expense(sharedId, 22_000));
    await createExpense(ownerA.id, expense(privateId, 33_000));

    const [snapshotA, snapshotB] = await Promise.all([
      loadWalletSnapshot(ownerA),
      loadWalletSnapshot(ownerB),
    ]);

    assert(snapshotA.displayName === "BILLETERA A", "El nombre A se mezcló.");
    assert(snapshotB.displayName === "BILLETERA B", "El nombre B se mezcló.");
    assert(snapshotA.monthlyBudget === 1_111_111, "El presupuesto A se mezcló.");
    assert(snapshotB.monthlyBudget === 2_222_222, "El presupuesto B se mezcló.");
    assert(snapshotA.expenses.length === 2, "La cuenta A no recibió sus gastos.");
    assert(snapshotB.expenses.length === 1, "La cuenta B vio gastos ajenos.");
    assert(
      snapshotB.expenses.every((item) => item.amount === 22_000),
      "La cuenta B pudo leer un gasto de la cuenta A.",
    );

    const crossDelete = await softDeleteExpense(ownerB.id, privateId);
    assert(!crossDelete, "La cuenta B pudo modificar un gasto de la cuenta A.");
    const snapshotAfterAttack = await loadWalletSnapshot(ownerA);
    assert(
      snapshotAfterAttack.expenses.some((item) => item.id === privateId),
      "El intento cruzado alteró la billetera A.",
    );

    console.log(
      JSON.stringify({
        status: "passed",
        separateNames: true,
        separateBudgets: true,
        separateExpenses: true,
        duplicateExpenseIdsAcrossOwners: true,
        crossOwnerMutationBlocked: true,
      }),
    );
  } finally {
    await prisma.expenseRecord.deleteMany({
      where: { ownerId: { in: ownerIds } },
    });
    await prisma.monthlyArchive.deleteMany({
      where: { ownerId: { in: ownerIds } },
    });
    await prisma.walletSettings.deleteMany({
      where: { ownerId: { in: ownerIds } },
    });
  }
}

try {
  await main();
} finally {
  await closePrismaClient();
}
