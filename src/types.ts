export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO format YYYY-MM-DD
  description: string;
}

export interface BudgetState {
  monthlyBudget: number;
  expenses: Expense[];
}

export interface WalletSnapshot extends BudgetState {
  deletedExpenses: Expense[];
}

export interface DailyExpenseSummary {
  dateLabel: string; // e.g. "Lun 13"
  fullDateLabel: string; // e.g. "Lunes, 13 de Julio"
  rawDate: string;
  amount: number;
  count: number;
}
