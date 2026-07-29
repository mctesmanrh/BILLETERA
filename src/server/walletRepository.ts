import type { Json, Tables, TablesInsert } from "../database.types.js";
import type { Expense, WalletSnapshot } from "../types.js";
import { getSupabaseClient } from "./supabase.js";

type ExpenseRow = Tables<"expenses">;
type ExpenseInsert = TablesInsert<"expenses">;

export class WalletRepositoryError extends Error {
  statusCode = 502;

  constructor(action: string, cause: unknown) {
    const detail = formatRepositoryError(cause);
    super(`Supabase no pudo ${action}: ${detail}`);
    this.name = "WalletRepositoryError";
  }
}

function formatRepositoryError(cause: unknown): string {
  if (cause instanceof Error) return cause.message;

  if (typeof cause === "object" && cause !== null) {
    const fields = ["message", "details", "hint", "code"] as const;
    const details = fields.flatMap((field) => {
      const value = Reflect.get(cause, field);
      return typeof value === "string" && value.trim()
        ? [`${field}: ${value.trim()}`]
        : [];
    });

    if (details.length > 0) return details.join("; ");

    try {
      return JSON.stringify(cause);
    } catch {
      return "error de Supabase sin detalles serializables";
    }
  }

  return String(cause);
}

function rowToExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    amount: row.amount,
    category: row.category,
    date: row.spent_on,
    description: row.description,
  };
}

function throwIfError(action: string, error: unknown): void {
  if (error) throw new WalletRepositoryError(action, error);
}

export async function loadWalletSnapshot(): Promise<WalletSnapshot> {
  const supabase = getSupabaseClient();
  const [settingsResult, expensesResult] = await Promise.all([
    supabase
      .from("wallet_settings")
      .select("monthly_budget")
      .eq("id", "main")
      .maybeSingle(),
    supabase
      .from("expenses")
      .select("*")
      .order("spent_on", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  throwIfError("leer el presupuesto", settingsResult.error);
  throwIfError("leer los gastos", expensesResult.error);

  if (!settingsResult.data) {
    throw new WalletRepositoryError("leer el presupuesto", new Error("No existe la configuración main."));
  }

  const rows = expensesResult.data ?? [];
  return {
    monthlyBudget: settingsResult.data.monthly_budget,
    expenses: rows.filter((row) => row.deleted_at === null).map(rowToExpense),
    deletedExpenses: rows.filter((row) => row.deleted_at !== null).map(rowToExpense),
  };
}

export async function updateBudget(monthlyBudget: number): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("wallet_settings").upsert(
    {
      id: "main",
      monthly_budget: monthlyBudget,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  throwIfError("actualizar el presupuesto", error);
}

export async function createExpense(expense: Expense): Promise<void> {
  const supabase = getSupabaseClient();
  const row: ExpenseInsert = {
    id: expense.id,
    amount: expense.amount,
    category: expense.category,
    spent_on: expense.date,
    description: expense.description,
  };
  const { error } = await supabase.from("expenses").insert(row);
  throwIfError("crear el gasto", error);
}

export async function softDeleteExpense(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("expenses")
    .update({ deleted_at: timestamp, updated_at: timestamp })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id")
    .maybeSingle();
  throwIfError("enviar el gasto a la papelera", error);
  return Boolean(data);
}

export async function restoreExpense(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  throwIfError("restaurar el gasto", error);
  return Boolean(data);
}

export async function permanentlyDeleteExpense(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  throwIfError("eliminar definitivamente el gasto", error);
  return Boolean(data);
}

export async function emptyTrash(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("expenses").delete().not("deleted_at", "is", null);
  throwIfError("vaciar la papelera", error);
}

export async function replaceWalletSnapshot(snapshot: WalletSnapshot): Promise<void> {
  const supabase = getSupabaseClient();
  const deletedAt = new Date().toISOString();
  const rows = [
    ...snapshot.expenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      category: expense.category,
      spent_on: expense.date,
      description: expense.description,
      deleted_at: null,
    })),
    ...snapshot.deletedExpenses.map((expense) => ({
      id: expense.id,
      amount: expense.amount,
      category: expense.category,
      spent_on: expense.date,
      description: expense.description,
      deleted_at: deletedAt,
    })),
  ];

  const { error } = await supabase.rpc("replace_wallet_snapshot", {
    p_monthly_budget: snapshot.monthlyBudget,
    p_expenses: rows as unknown as Json,
  });
  throwIfError("restaurar la copia de seguridad", error);
}

export async function checkDatabaseConnection(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("wallet_settings")
    .select("id", { head: true, count: "exact" })
    .eq("id", "main");
  throwIfError("comprobar la conexión", error);
}
