import type { Expense, WalletData } from "../types.js";

const CATEGORY_KEYS = new Set([
  "alimentacion",
  "transporte",
  "servicios",
  "salud",
  "entretenimiento",
  "otros",
]);

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_PATTERN = /^\d{4}-\d{2}$/;
const ID_PATTERN = /^[a-zA-Z0-9._:-]{1,120}$/;
const MAX_MONEY_VALUE = 999_999_999_999;

export class RequestValidationError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "RequestValidationError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateDate(value: unknown): string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new RequestValidationError("La fecha debe usar el formato YYYY-MM-DD.");
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new RequestValidationError("La fecha del gasto no es válida.");
  }

  return value;
}

export function validateBudget(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > MAX_MONEY_VALUE
  ) {
    throw new RequestValidationError("El presupuesto debe ser un entero válido mayor o igual a cero.");
  }

  return value;
}

export function validateExpense(
  value: unknown,
  options: { requireId: boolean },
): Expense | Omit<Expense, "id"> {
  if (!isRecord(value)) {
    throw new RequestValidationError("Los datos del gasto no son válidos.");
  }

  if (
    typeof value.amount !== "number" ||
    !Number.isSafeInteger(value.amount) ||
    value.amount <= 0 ||
    value.amount > MAX_MONEY_VALUE
  ) {
    throw new RequestValidationError("El monto debe ser un entero válido mayor a cero.");
  }

  if (typeof value.category !== "string" || !CATEGORY_KEYS.has(value.category)) {
    throw new RequestValidationError("La categoría del gasto no es válida.");
  }

  if (typeof value.description !== "string") {
    throw new RequestValidationError("La descripción del gasto es obligatoria.");
  }

  const description = value.description.trim();
  if (!description || description.length > 500) {
    throw new RequestValidationError("La descripción debe contener entre 1 y 500 caracteres.");
  }

  const expense = {
    amount: value.amount,
    category: value.category,
    date: validateDate(value.date),
    description,
  };

  if (!options.requireId) return expense;

  if (typeof value.id !== "string" || !ID_PATTERN.test(value.id)) {
    throw new RequestValidationError("El identificador del gasto no es válido.");
  }

  return { id: value.id, ...expense };
}

export function validateExpenseMonth(date: string, activeMonth: string): void {
  if (date.slice(0, 7) !== activeMonth.slice(0, 7)) {
    throw new RequestValidationError(
      `El gasto debe pertenecer al mes activo (${activeMonth.slice(0, 7)}).`,
    );
  }
}

export function validateReportMonth(value: unknown): string {
  if (typeof value !== "string" || !MONTH_PATTERN.test(value)) {
    throw new RequestValidationError("El mes del informe debe usar el formato YYYY-MM.");
  }
  return validateDate(`${value}-01`);
}

export function validateWalletSnapshot(value: unknown): WalletData {
  if (!isRecord(value)) {
    throw new RequestValidationError("La copia de seguridad no es válida.");
  }

  if (!Array.isArray(value.expenses) || !Array.isArray(value.deletedExpenses)) {
    throw new RequestValidationError("La copia debe incluir gastos y papelera como listas.");
  }

  const expenses = value.expenses.map((expense) =>
    validateExpense(expense, { requireId: true }),
  ) as Expense[];
  const deletedExpenses = value.deletedExpenses.map((expense) =>
    validateExpense(expense, { requireId: true }),
  ) as Expense[];

  const ids = new Set<string>();
  for (const expense of [...expenses, ...deletedExpenses]) {
    if (ids.has(expense.id)) {
      throw new RequestValidationError(`El gasto ${expense.id} está duplicado en la copia.`);
    }
    ids.add(expense.id);
  }

  return {
    monthlyBudget: validateBudget(value.monthlyBudget),
    expenses,
    deletedExpenses,
  };
}
