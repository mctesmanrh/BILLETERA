export interface Expense {
  id: string;
  amount: number;
  category: string;
  date: string; // ISO format YYYY-MM-DD
  description: string;
  deletedAt?: string;
}

export interface BudgetState {
  monthlyBudget: number;
  expenses: Expense[];
}

export interface WalletData extends BudgetState {
  deletedExpenses: Expense[];
}

export interface MonthlyReportSummary {
  monthStart: string;
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  expenseCount: number;
  deletedExpenseCount: number;
  archivedAt: string;
}

export interface MonthlyReport extends MonthlyReportSummary {
  expenses: Expense[];
  deletedExpenses: Expense[];
}

export interface WalletSnapshot extends WalletData {
  activeMonth: string;
  monthlyReports: MonthlyReportSummary[];
}

export interface AuthUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export interface AuthSession {
  user?: AuthUser;
  expires: string;
}

export interface DailyExpenseSummary {
  dateLabel: string; // e.g. "Lun 13"
  fullDateLabel: string; // e.g. "Lunes, 13 de Julio"
  rawDate: string;
  amount: number;
  count: number;
}
