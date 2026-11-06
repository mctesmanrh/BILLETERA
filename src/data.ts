import { Expense, DailyExpenseSummary } from "./types";

export const CATEGORIES: Record<string, { label: string; icon: string; bgClass: string; textClass: string; color: string }> = {
  alimentacion: {
    label: "Alimentación",
    icon: "Utensils",
    bgClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    textClass: "text-emerald-600",
    color: "#10b981", // emerald-500
  },
  transporte: {
    label: "Transporte",
    icon: "Car",
    bgClass: "bg-amber-50 text-amber-700 border-amber-100",
    textClass: "text-amber-600",
    color: "#f59e0b", // amber-500
  },
  servicios: {
    label: "Servicios del Hogar",
    icon: "Lightbulb",
    bgClass: "bg-blue-50 text-blue-700 border-blue-100",
    textClass: "text-blue-600",
    color: "#3b82f6", // blue-500
  },
  salud: {
    label: "Salud & Farmacia",
    icon: "HeartPulse",
    bgClass: "bg-rose-50 text-rose-700 border-rose-100",
    textClass: "text-rose-600",
    color: "#f43f5e", // rose-500
  },
  entretenimiento: {
    label: "Entretenimiento",
    icon: "Tv",
    bgClass: "bg-purple-50 text-purple-700 border-purple-100",
    textClass: "text-purple-600",
    color: "#a855f7", // purple-500
  },
  otros: {
    label: "Otros Gastos",
    icon: "Tag",
    bgClass: "bg-slate-50 text-slate-700 border-slate-100",
    textClass: "text-slate-600",
    color: "#64748b", // slate-500
  },
};

// Initial list of expenses for the month of July 2026, leading up to July 14
export const INITIAL_EXPENSES: Expense[] = [
  {
    id: "exp-1",
    amount: 245000,
    category: "alimentacion",
    date: "2026-07-13",
    description: "Compra semanal de supermercado",
  },
  {
    id: "exp-2",
    amount: 95000,
    category: "transporte",
    date: "2026-07-12",
    description: "Carga de combustible",
  },
  {
    id: "exp-3",
    amount: 65000,
    category: "alimentacion",
    date: "2026-07-11",
    description: "Cena en restaurante",
  },
  {
    id: "exp-4",
    amount: 180000,
    category: "servicios",
    date: "2026-07-10",
    description: "Servicio de internet y luz",
  },
  {
    id: "exp-5",
    amount: 42000,
    category: "salud",
    date: "2026-07-09",
    description: "Medicamentos farmacia",
  },
  {
    id: "exp-6",
    amount: 55000,
    category: "entretenimiento",
    date: "2026-07-07",
    description: "Entradas de cine y snacks",
  },
  {
    id: "exp-7",
    amount: 18000,
    category: "transporte",
    date: "2026-07-06",
    description: "Viaje en taxi",
  },
  {
    id: "exp-8",
    amount: 35000,
    category: "alimentacion",
    date: "2026-07-05",
    description: "Almuerzo de trabajo",
  },
  {
    id: "exp-9",
    amount: 45000,
    category: "otros",
    date: "2026-07-04",
    description: "Regalo de cumpleaños",
  },
  {
    id: "exp-10",
    amount: 38000,
    category: "alimentacion",
    date: "2026-07-02",
    description: "Frutería y verdulería",
  },
  {
    id: "exp-11",
    amount: 12000,
    category: "transporte",
    date: "2026-07-01",
    description: "Tarjeta de transporte público",
  },
];

// Date Helper Utilities
export function getColombiaTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Bogota",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch (e) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export function getColombiaCurrentMonthStart(): string {
  return `${getColombiaTodayDateString().slice(0, 7)}-01`;
}

export function getMonthEndDateString(monthStart: string): string {
  const [year, month] = monthStart.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

export function formatMonthYearSpanish(monthStart: string): string {
  const parsed = new Date(`${monthStart}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return monthStart;

  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function getDayInfo(dateStr: string) {
  if (!dateStr) {
    return getDayInfo(getColombiaTodayDateString());
  }
  const parts = dateStr.split("-").map(Number);
  const year = parts[0] || 2026;
  const month = parts[1] || 7;
  const day = parts[2] || 1;

  // Local date constructor to prevent UTC offset shifting
  const dateObj = new Date(year, month - 1, day);
  
  const daysShort = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const daysFull = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const dayIndex = dateObj.getDay();
  return {
    shortDay: daysShort[dayIndex],
    fullDay: daysFull[dayIndex],
    dayNum: day,
    monthName: months[month - 1],
  };
}

export function formatDateSpanish(dateStr: string): string {
  const { fullDay, dayNum, monthName } = getDayInfo(dateStr);
  return `${fullDay}, ${dayNum} de ${monthName}`;
}

export function formatDateShortSpanish(dateStr: string): string {
  const { shortDay, dayNum, monthName } = getDayInfo(dateStr);
  return `${shortDay} ${dayNum} ${monthName.slice(0, 3)}`;
}

// Helper to generate the daily chart data for the active wallet month.
export function getDailyExpensesSummary(
  expenses: Expense[],
  activeMonth: string,
): DailyExpenseSummary[] {
  const datesSet = new Set<string>();
  const todayColombia = getColombiaTodayDateString();
  const currentMonth = `${todayColombia.slice(0, 7)}-01`;
  const monthEnd = getMonthEndDateString(activeMonth);
  const visibleLastDay = activeMonth === currentMonth
    ? Number(todayColombia.slice(8, 10))
    : Number(monthEnd.slice(8, 10));

  for (let day = 1; day <= visibleLastDay; day += 1) {
    datesSet.add(`${activeMonth.slice(0, 8)}${String(day).padStart(2, "0")}`);
  }

  expenses.forEach(exp => {
    if (exp.date.startsWith(activeMonth.slice(0, 7))) {
      datesSet.add(exp.date);
    }
  });

  // Sort dates chronologically
  const sortedDates = Array.from(datesSet).sort();

  return sortedDates.map(dateKey => {
    const dayExpenses = expenses.filter(exp => exp.date === dateKey);
    const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const { shortDay, fullDay, dayNum, monthName } = getDayInfo(dateKey);

    return {
      dateLabel: `${shortDay} ${dayNum}`,
      fullDateLabel: `${fullDay}, ${dayNum} de ${monthName}`,
      rawDate: dateKey,
      amount: dayTotal,
      count: dayExpenses.length,
    };
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace("COP", "$").trim();
}
