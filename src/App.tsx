import React, { useEffect, useRef, useState } from "react";
import BudgetDefiner from "./components/BudgetDefiner";
import MetricCards from "./components/MetricCards";
import ExpenseRatio from "./components/ExpenseRatio";
import DailyChart from "./components/DailyChart";
import RecentExpenses from "./components/RecentExpenses";
import NewExpenseForm from "./components/NewExpenseForm";
import MovementsList from "./components/MovementsList";
import ExpenseDetail from "./components/ExpenseDetail";
import TrashBin from "./components/TrashBin";
import type {
  Expense,
  MonthlyReport,
  MonthlyReportSummary,
  WalletData,
  WalletSnapshot,
  AuthUser,
} from "./types";
import {
  formatMonthYearSpanish,
  getColombiaCurrentMonthStart,
  getDailyExpensesSummary,
} from "./data";
import {
  Check,
  Download,
  LayoutDashboard,
  List,
  LoaderCircle,
  Pencil,
  PiggyBank,
  Plus,
  Trash,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import BackupManager from "./components/BackupManager";
import UserMenu from "./components/UserMenu";

const LEGACY_CACHE_KEYS = [
  "walletDisplayName",
  "monthlyBudget",
  "expenses",
  "deletedExpenses",
  "activeMonth",
  "monthlyReports",
];

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || `La solicitud falló con estado ${response.status}.`);
  }

  return payload as T;
}

interface AppProps {
  currentUser: AuthUser;
  csrfToken: string;
}

export default function App({ currentUser, csrfToken }: AppProps) {
  const defaultDisplayName = (currentUser.name || "MI BILLETERA")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("es-CO");
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [displayNameDraft, setDisplayNameDraft] = useState(displayName);
  const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(1500000);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [deletedExpenses, setDeletedExpenses] = useState<Expense[]>([]);
  const [activeMonth, setActiveMonth] = useState<string>(
    getColombiaCurrentMonthStart(),
  );
  const [monthlyReports, setMonthlyReports] = useState<MonthlyReportSummary[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const budgetSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentView, setCurrentView] = useState<
    "dashboard" | "new-expense" | "movements" | "detail" | "trash"
  >("dashboard");
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const applySnapshot = (snapshot: WalletSnapshot) => {
    const nextDisplayName = snapshot.displayName || defaultDisplayName;
    setDisplayName(nextDisplayName);
    setDisplayNameDraft(nextDisplayName);
    setMonthlyBudget(snapshot.monthlyBudget);
    setExpenses(snapshot.expenses);
    setDeletedExpenses(snapshot.deletedExpenses);
    setActiveMonth(snapshot.activeMonth);
    setMonthlyReports(snapshot.monthlyReports);
  };

  useEffect(() => {
    let active = true;
    LEGACY_CACHE_KEYS.forEach((key) => localStorage.removeItem(key));

    requestJson<WalletSnapshot>("/api/data")
      .then((snapshot) => {
        if (!active) return;
        applySnapshot(snapshot);
        setSyncError(null);
      })
      .catch((error: Error) => {
        if (!active) return;
        console.error("No fue posible cargar PostgreSQL:", error);
        setSyncError(error.message);
      })
      .finally(() => {
        if (active) setIsLoadingData(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (budgetSaveTimeout.current) {
        clearTimeout(budgetSaveTimeout.current);
      }
    };
  }, []);

  const handleChangeBudget = (newBudget: number) => {
    setMonthlyBudget(newBudget);

    if (budgetSaveTimeout.current) {
      clearTimeout(budgetSaveTimeout.current);
    }

    budgetSaveTimeout.current = setTimeout(() => {
      requestJson<{ success: true }>("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget: newBudget }),
      })
        .then(() => setSyncError(null))
        .catch((error: Error) => {
          console.error("No fue posible guardar el presupuesto:", error);
          setSyncError(error.message);
        });
    }, 400);
  };

  const cancelDisplayNameEdit = () => {
    setDisplayNameDraft(displayName);
    setIsEditingDisplayName(false);
    setSyncError(null);
  };

  const handleSaveDisplayName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSavingDisplayName) return;

    const normalizedName = displayNameDraft.trim().replace(/\s+/g, " ");
    if (!normalizedName) {
      setSyncError("Escribe un nombre antes de guardarlo.");
      return;
    }
    if (normalizedName === displayName) {
      cancelDisplayNameEdit();
      return;
    }

    setIsSavingDisplayName(true);
    try {
      const result = await requestJson<{
        success: true;
        displayName: string;
      }>("/api/settings/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: normalizedName }),
      });
      setDisplayName(result.displayName);
      setDisplayNameDraft(result.displayName);
      setIsEditingDisplayName(false);
      setSyncError(null);
    } catch (error) {
      setSyncError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar el nombre de la billetera.",
      );
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handleImportData = async (snapshot: WalletData) => {
    try {
      const imported = await requestJson<WalletSnapshot & { success: true }>(
        "/api/import",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(snapshot),
        },
      );
      applySnapshot(imported);
      setSyncError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo restaurar la copia.";
      setSyncError(message);
      throw new Error(message);
    }
  };

  const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const availableBalance = monthlyBudget - totalSpent;
  const dailyChartData = getDailyExpensesSummary(expenses, activeMonth);

  const handleSaveExpense = async (newExpense: Omit<Expense, "id">) => {
    try {
      const result = await requestJson<WalletSnapshot & { expense: Expense }>("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expense: newExpense }),
      });
      applySnapshot(result);
      setCurrentView("dashboard");
      setSyncError(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el gasto.";
      setSyncError(message);
      throw new Error(message);
    }
  };

  const runSnapshotMutation = async (
    url: string,
    init: RequestInit,
    successView?: typeof currentView,
  ): Promise<boolean> => {
    try {
      const snapshot = await requestJson<WalletSnapshot>(url, init);
      applySnapshot(snapshot);
      setSyncError(null);
      if (successView) setCurrentView(successView);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo guardar el cambio.";
      setSyncError(message);
      window.alert(message);
      return false;
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const deleted = await runSnapshotMutation(
      `/api/expenses/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      "dashboard",
    );
    if (deleted) setSelectedExpense(null);
  };

  const handleRestoreExpense = async (expense: Expense) => {
    await runSnapshotMutation(
      `/api/expenses/${encodeURIComponent(expense.id)}/restore`,
      { method: "POST" },
    );
  };

  const handlePermanentDelete = async (id: string) => {
    await runSnapshotMutation(
      `/api/expenses/${encodeURIComponent(id)}/permanent`,
      { method: "DELETE" },
    );
  };

  const handleEmptyTrash = async () => {
    await runSnapshotMutation(
      "/api/expenses/trash/empty",
      { method: "POST" },
    );
  };

  const handleSelectExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setCurrentView("detail");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans antialiased py-6 px-4 md:px-8">
      <div className="max-w-[1140px] mx-auto flex flex-col min-h-[calc(100vh-3rem)] justify-between">
        
        {/* Main Content Area */}
        <div>
          {/* Clean Minimalism Header Section */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                <PiggyBank className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold leading-tight tracking-tight text-slate-800">
                  GASTOS MENSUALES
                </p>
                {isEditingDisplayName ? (
                  <form
                    onSubmit={handleSaveDisplayName}
                    className="mt-0.5 flex max-w-full items-center gap-1.5"
                  >
                    <label htmlFor="wallet-display-name" className="sr-only">
                      Nombre de la billetera
                    </label>
                    <input
                      id="wallet-display-name"
                      autoFocus
                      maxLength={60}
                      value={displayNameDraft}
                      onChange={(event) => setDisplayNameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Escape") cancelDisplayNameEdit();
                      }}
                      className="min-w-0 w-full max-w-72 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xl font-bold leading-tight tracking-tight text-slate-800 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                    />
                    <button
                      type="submit"
                      disabled={isSavingDisplayName}
                      aria-label="Guardar nombre"
                      title="Guardar"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isSavingDisplayName ? (
                        <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelDisplayNameEdit}
                      disabled={isSavingDisplayName}
                      aria-label="Cancelar edición del nombre"
                      title="Cancelar"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </form>
                ) : (
                  <div className="group mt-0.5 flex min-w-0 items-center gap-1.5">
                    <h1 className="truncate text-2xl font-bold leading-tight tracking-tight text-slate-800">
                      {displayName}
                    </h1>
                    <button
                      type="button"
                      onClick={() => {
                        setDisplayNameDraft(displayName);
                        setIsEditingDisplayName(true);
                      }}
                      aria-label="Editar nombre de la billetera"
                      title="Editar nombre"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus-visible:bg-slate-100 focus-visible:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <p className="text-slate-500 text-xs font-sans">Control rápido e inteligente de tus gastos</p>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2">
              <UserMenu user={currentUser} csrfToken={csrfToken} />

              {/* View Switch Navigation */}
              <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200/80 shadow-xs">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentView === 'dashboard'
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>

              <button
                onClick={() => setCurrentView('movements')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentView === 'movements'
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Movimientos</span>
              </button>

              <button
                onClick={() => setCurrentView('new-expense')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentView === 'new-expense'
                    ? "bg-rose-600 text-white"
                    : "bg-rose-50 text-rose-600 hover:bg-rose-100/70"
                }`}
                id="btn-nav-new-expense"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Gasto</span>
              </button>

              <button
                onClick={() => setCurrentView('trash')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  currentView === 'trash'
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                id="btn-nav-trash"
              >
                <Trash className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Papelera</span>
                {deletedExpenses.length > 0 && (
                  <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold leading-none shrink-0 font-sans">
                    {deletedExpenses.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setIsBackupOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer bg-amber-50 text-amber-800 hover:bg-amber-100/80 border border-amber-200/80"
                title="Copias e informes mensuales"
                id="btn-nav-backup"
              >
                <Download className="w-3.5 h-3.5 text-amber-600" />
                <span>Informes</span>
              </button>
              </div>
            </div>
          </header>

          {(isLoadingData || syncError) && (
            <div
              className={`mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs ${
                syncError
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-indigo-100 bg-indigo-50 text-indigo-800"
              }`}
              role="status"
              aria-live="polite"
            >
              <span>
                {syncError
                  ? syncError
                  : "Conectando con la base de datos PostgreSQL…"}
              </span>
              {syncError && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="shrink-0 rounded-xl bg-white px-3 py-1.5 font-bold text-amber-900 shadow-xs ring-1 ring-amber-200"
                >
                  Reintentar conexión
                </button>
              )}
            </div>
          )}

          {/* Dynamic Screens Router */}
          <AnimatePresence mode="wait">
            {currentView === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="space-y-10"
              >
                {/* Header Action Row */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">
                      Mi Presupuesto Activo
                    </h2>
                    <p className="text-sm text-slate-400">
                      {formatMonthYearSpanish(activeMonth)} · reinicio mensual automático
                    </p>
                  </div>
                  
                  {/* Primary button to trigger "Nuevo Gasto" in under 1 second */}
                  <button
                    onClick={() => setCurrentView('new-expense')}
                    className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition-all cursor-pointer group"
                    id="btn-register-expense-main"
                  >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    Registrar Gasto
                  </button>
                </div>

                {/* Key Metrics Row (Formula component) */}
                <MetricCards 
                  monthlyBudget={monthlyBudget} 
                  totalSpent={totalSpent} 
                  availableBalance={availableBalance} 
                  activeMonth={activeMonth}
                />

                {/* Main Workspace Layout Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Daily Expenses Chart (7/12 width) */}
                  <div className="lg:col-span-7 flex flex-col justify-between">
                    {expenses.length === 0 ? (
                      <div className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-12 shadow-xs text-center flex flex-col items-center justify-center gap-6 h-full min-h-[300px]">
                        <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                          <PiggyBank className="w-7 h-7" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-lg font-bold tracking-tight text-slate-800">Aún no hay gastos este mes</h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Registra el primero y empieza a ver en qué se va la plata
                          </p>
                        </div>
                        <button
                          onClick={() => setCurrentView('new-expense')}
                          className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition-all cursor-pointer group"
                        >
                          <Plus className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
                          Registrar tu primer gasto
                        </button>
                      </div>
                    ) : (
                      <DailyChart data={dailyChartData} />
                    )}
                  </div>

                  {/* Right Column: Controls, Ratio and Recent list (5/12 width) */}
                  <div className="lg:col-span-5 space-y-8">
                    {/* Sliders to define Budget limit */}
                    <BudgetDefiner 
                      monthlyBudget={monthlyBudget} 
                      onChangeBudget={handleChangeBudget} 
                    />

                    {/* Ratio gauge widget */}
                    <ExpenseRatio 
                      monthlyBudget={monthlyBudget} 
                      totalSpent={totalSpent} 
                      availableBalance={availableBalance} 
                    />

                    {/* List of latest 5 expenses */}
                    <RecentExpenses 
                      expenses={expenses} 
                      onSelectExpense={handleSelectExpense}
                      onViewAll={() => setCurrentView('movements')}
                    />
                  </div>

                </div>
              </motion.div>
            )}

            {currentView === 'new-expense' && (
              <motion.div
                key="new-expense"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <NewExpenseForm
                  onSave={handleSaveExpense}
                  onCancel={() => setCurrentView('dashboard')}
                  activeMonth={activeMonth}
                />
              </motion.div>
            )}

            {currentView === 'movements' && (
              expenses.length === 0 ? (
                <motion.div
                  key="movements-empty"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-16 shadow-xs text-center max-w-xl mx-auto my-12 flex flex-col items-center justify-center gap-6"
                >
                  <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                    <List className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold tracking-tight text-slate-800">Tus gastos van a vivir aquí</h2>
                    <p className="text-sm text-slate-500">
                      Cada vez que pagues algo, lo registras y aparece en esta lista
                    </p>
                  </div>
                  <button
                    onClick={() => setCurrentView('new-expense')}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-2xl shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 transition-all cursor-pointer group"
                  >
                    <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                    Registrar gasto
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="movements"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <MovementsList
                    expenses={expenses}
                    onSelectExpense={handleSelectExpense}
                    onBack={() => setCurrentView('dashboard')}
                  />
                </motion.div>
              )
            )}

            {currentView === 'detail' && (
              (!selectedExpense || expenses.length === 0) ? (
                <motion.div
                  key="detail-empty"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white border border-slate-100 rounded-[32px] p-8 md:p-16 shadow-xs text-center max-w-xl mx-auto my-12 flex flex-col items-center justify-center gap-4"
                >
                  <p className="text-sm text-slate-400 font-medium font-sans">
                    Selecciona un gasto en Movimientos para ver el detalle
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="detail"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.3 }}
                >
                  <ExpenseDetail
                    expense={selectedExpense}
                    onBack={() => setCurrentView('movements')}
                    onDelete={handleDeleteExpense}
                  />
                </motion.div>
              )
            )}

            {currentView === 'trash' && (
              <motion.div
                key="trash"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
              >
                <TrashBin
                  deletedExpenses={deletedExpenses}
                  onRestore={handleRestoreExpense}
                  onPermanentDelete={handlePermanentDelete}
                  onEmptyTrash={handleEmptyTrash}
                  onBack={() => setCurrentView('dashboard')}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Decorative Theme Footer */}
        <footer className="mt-12 pt-6 border-t border-slate-200/80 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-slate-300 font-bold uppercase tracking-[0.2em] text-center sm:text-left">
            Presupuesto mensual inteligente • PostgreSQL Prisma ORM • Google Auth • Sistema v.2.0
          </p>
          <div className="h-1 w-24 bg-slate-200 rounded-full"></div>
        </footer>

      </div>

      {/* Backup & Restore Modal */}
      <BackupManager
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        monthlyBudget={monthlyBudget}
        expenses={expenses}
        deletedExpenses={deletedExpenses}
        activeMonth={activeMonth}
        monthlyReports={monthlyReports}
        onImportData={handleImportData}
        onLoadMonthlyReport={(monthStart) =>
          requestJson<MonthlyReport>(`/api/reports/${monthStart.slice(0, 7)}`)
        }
      />
    </div>
  );
}
