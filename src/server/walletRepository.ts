import type {
  Expense,
  MonthlyReport,
  MonthlyReportSummary,
  WalletData,
  WalletSnapshot,
} from "../types.js";
import { getPrismaClient } from "./prisma.js";

export class WalletRepositoryError extends Error {
  statusCode = 502;

  constructor(action: string, cause: unknown) {
    super(`PostgreSQL Prisma ORM no pudo ${action}: ${formatRepositoryError(cause)}`);
    this.name = "WalletRepositoryError";
  }
}

function formatRepositoryError(cause: unknown): string {
  if (cause instanceof Error) return cause.message;

  if (typeof cause === "object" && cause !== null) {
    const fields = ["message", "detail", "hint", "code", "constraint"] as const;
    const details = fields.flatMap((field) => {
      const value = Reflect.get(cause, field);
      return typeof value === "string" && value.trim()
        ? [`${field}: ${value.trim()}`]
        : [];
    });
    if (details.length > 0) return details.join("; ");
  }

  return String(cause);
}

async function runRepositoryAction<T>(
  action: string,
  operation: () => Promise<T>,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof WalletRepositoryError) throw error;
    throw new WalletRepositoryError(action, error);
  }
}

function toNumber(value: bigint | number | string): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`La base devolvió un entero fuera del rango seguro: ${value}`);
  }
  return parsed;
}

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function recordToExpense(record: {
  id: string;
  amount: bigint;
  category: string;
  spentOn: Date;
  description: string;
  deletedAt: Date | null;
}): Expense {
  return {
    id: record.id,
    amount: toNumber(record.amount),
    category: record.category,
    date: toDateString(record.spentOn),
    description: record.description,
    ...(record.deletedAt ? { deletedAt: record.deletedAt.toISOString() } : {}),
  };
}

function jsonToExpenses(value: unknown): Expense[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    if (
      typeof item !== "object" ||
      item === null ||
      Array.isArray(item) ||
      typeof Reflect.get(item, "id") !== "string" ||
      typeof Reflect.get(item, "category") !== "string" ||
      typeof Reflect.get(item, "date") !== "string" ||
      typeof Reflect.get(item, "description") !== "string"
    ) {
      return [];
    }

    const amountValue = Reflect.get(item, "amount");
    const amount =
      typeof amountValue === "number"
        ? amountValue
        : typeof amountValue === "string"
          ? Number(amountValue)
          : Number.NaN;
    if (!Number.isSafeInteger(amount) || amount <= 0) return [];

    const deletedAt = Reflect.get(item, "deletedAt");
    return [{
      id: Reflect.get(item, "id") as string,
      amount,
      category: Reflect.get(item, "category") as string,
      date: Reflect.get(item, "date") as string,
      description: Reflect.get(item, "description") as string,
      ...(typeof deletedAt === "string" ? { deletedAt } : {}),
    }];
  });
}

function archiveToSummary(record: {
  monthStart: Date;
  monthlyBudget: bigint;
  totalSpent: bigint;
  expenseCount: bigint;
  deletedExpenseCount: bigint;
  archivedAt: Date;
}): MonthlyReportSummary {
  const monthlyBudget = toNumber(record.monthlyBudget);
  const totalSpent = toNumber(record.totalSpent);
  return {
    monthStart: toDateString(record.monthStart),
    monthlyBudget,
    totalSpent,
    availableBalance: monthlyBudget - totalSpent,
    expenseCount: toNumber(record.expenseCount),
    deletedExpenseCount: toNumber(record.deletedExpenseCount),
    archivedAt: record.archivedAt.toISOString(),
  };
}

function getColombiaCurrentMonthStart(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${formatter.format(new Date()).slice(0, 7)}-01`;
}

function getNextMonthStart(monthStart: string): string {
  const [year, month] = monthStart.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;
}

export async function ensureCurrentWalletMonth(): Promise<string> {
  return runRepositoryAction("cerrar el mes anterior", async () => {
    const targetMonth = getColombiaCurrentMonthStart();
    await getPrismaClient().$queryRaw`
      select billetera.rollover_wallet_month(${targetMonth}::date)
    `;
    return targetMonth;
  });
}

export async function loadWalletSnapshot(): Promise<WalletSnapshot> {
  return runRepositoryAction("leer la billetera", async () => {
    const prisma = getPrismaClient();
    const targetMonth = await ensureCurrentWalletMonth();
    const nextMonth = getNextMonthStart(targetMonth);

    const [settings, expenses, archives] = await Promise.all([
      prisma.walletSettings.findUnique({ where: { id: "main" } }),
      prisma.expenseRecord.findMany({
        where: {
          spentOn: {
            gte: toDateOnly(targetMonth),
            lt: toDateOnly(nextMonth),
          },
        },
        orderBy: [{ spentOn: "desc" }, { createdAt: "desc" }],
      }),
      prisma.monthlyArchive.findMany({ orderBy: { monthStart: "desc" } }),
    ]);

    if (!settings) throw new Error("No existe la configuración main.");

    return {
      monthlyBudget: toNumber(settings.monthlyBudget),
      expenses: expenses
        .filter((record) => record.deletedAt === null)
        .map(recordToExpense),
      deletedExpenses: expenses
        .filter((record) => record.deletedAt !== null)
        .map(recordToExpense),
      activeMonth: toDateString(settings.activeMonth),
      monthlyReports: archives.map(archiveToSummary),
    };
  });
}

export async function updateBudget(monthlyBudget: number): Promise<void> {
  await runRepositoryAction("actualizar el presupuesto", async () => {
    await ensureCurrentWalletMonth();
    await getPrismaClient().walletSettings.update({
      where: { id: "main" },
      data: { monthlyBudget: BigInt(monthlyBudget), updatedAt: new Date() },
    });
  });
}

export async function createExpense(expense: Expense): Promise<void> {
  await runRepositoryAction("crear el gasto", async () => {
    await getPrismaClient().expenseRecord.create({
      data: {
        id: expense.id,
        amount: BigInt(expense.amount),
        category: expense.category,
        spentOn: toDateOnly(expense.date),
        description: expense.description,
      },
    });
  });
}

export async function loadMonthlyReport(
  monthStart: string,
): Promise<MonthlyReport | null> {
  return runRepositoryAction("leer el informe mensual", async () => {
    await ensureCurrentWalletMonth();
    const record = await getPrismaClient().monthlyArchive.findUnique({
      where: { monthStart: toDateOnly(monthStart) },
    });
    if (!record) return null;

    return {
      ...archiveToSummary(record),
      expenses: jsonToExpenses(record.expenses),
      deletedExpenses: jsonToExpenses(record.deletedExpenses),
    };
  });
}

export async function softDeleteExpense(id: string): Promise<boolean> {
  return runRepositoryAction("enviar el gasto a la papelera", async () => {
    const result = await getPrismaClient().expenseRecord.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), updatedAt: new Date() },
    });
    return result.count === 1;
  });
}

export async function restoreExpense(id: string): Promise<boolean> {
  return runRepositoryAction("restaurar el gasto", async () => {
    const result = await getPrismaClient().expenseRecord.updateMany({
      where: { id, deletedAt: { not: null } },
      data: { deletedAt: null, updatedAt: new Date() },
    });
    return result.count === 1;
  });
}

export async function permanentlyDeleteExpense(id: string): Promise<boolean> {
  return runRepositoryAction("eliminar definitivamente el gasto", async () => {
    const result = await getPrismaClient().expenseRecord.deleteMany({
      where: { id, deletedAt: { not: null } },
    });
    return result.count === 1;
  });
}

export async function emptyTrash(): Promise<void> {
  await runRepositoryAction("vaciar la papelera", async () => {
    await getPrismaClient().expenseRecord.deleteMany({
      where: { deletedAt: { not: null } },
    });
  });
}

export async function replaceWalletSnapshot(snapshot: WalletData): Promise<void> {
  await runRepositoryAction("restaurar la copia de seguridad", async () => {
    const deletedAt = new Date();
    const rows = [
      ...snapshot.expenses.map((expense) => ({
        id: expense.id,
        amount: BigInt(expense.amount),
        category: expense.category,
        spentOn: toDateOnly(expense.date),
        description: expense.description,
        deletedAt: null,
      })),
      ...snapshot.deletedExpenses.map((expense) => ({
        id: expense.id,
        amount: BigInt(expense.amount),
        category: expense.category,
        spentOn: toDateOnly(expense.date),
        description: expense.description,
        deletedAt: expense.deletedAt ? new Date(expense.deletedAt) : deletedAt,
      })),
    ];

    await getPrismaClient().$transaction(async (transaction) => {
      await transaction.$queryRaw`
        select pg_advisory_xact_lock(hashtext('tu-billetera-wallet-import'))
      `;
      await transaction.walletSettings.update({
        where: { id: "main" },
        data: {
          monthlyBudget: BigInt(snapshot.monthlyBudget),
          updatedAt: new Date(),
        },
      });
      await transaction.expenseRecord.deleteMany();

      if (rows.length > 0) {
        await transaction.expenseRecord.createMany({ data: rows });
        const oldest = await transaction.expenseRecord.aggregate({
          _min: { spentOn: true },
        });
        if (oldest._min.spentOn) {
          const settings = await transaction.walletSettings.findUniqueOrThrow({
            where: { id: "main" },
            select: { activeMonth: true },
          });
          if (oldest._min.spentOn < settings.activeMonth) {
            await transaction.walletSettings.update({
              where: { id: "main" },
              data: { activeMonth: oldest._min.spentOn, updatedAt: new Date() },
            });
          }
        }
      }

      const targetMonth = getColombiaCurrentMonthStart();
      await transaction.$queryRaw`
        select billetera.rollover_wallet_month(${targetMonth}::date)
      `;
    }, { maxWait: 5_000, timeout: 15_000 });
  });
}

export async function checkDatabaseConnection(): Promise<void> {
  await runRepositoryAction("comprobar la conexión", async () => {
    await ensureCurrentWalletMonth();
    const settings = await getPrismaClient().walletSettings.findUnique({
      where: { id: "main" },
      select: { id: true },
    });
    if (!settings) throw new Error("No existe la configuración main.");
  });
}
