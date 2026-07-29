import React from "react";
import { Expense } from "../types";
import { CATEGORIES, formatCurrency, formatDateSpanish, formatDateShortSpanish } from "../data";
import { ArrowRight, Calendar } from "lucide-react";
import * as Icons from "lucide-react";

interface RecentExpensesProps {
  expenses: Expense[];
  onSelectExpense: (expense: Expense) => void;
  onViewAll: () => void;
}

// Dynamic Lucide icon component helper
const CategoryIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = (Icons as any)[iconName];
  if (!IconComponent) return <Icons.Tag className={className} />;
  return <IconComponent className={className} />;
};

export default function RecentExpenses({ expenses, onSelectExpense, onViewAll }: RecentExpensesProps) {
  // Sort by date descending and take top 5
  const last5Expenses = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  return (
    <div id="recent-expenses-card" className="bg-white rounded-[32px] border border-slate-100 p-6 shadow-sm flex flex-col">
      <div className="mb-4 px-2 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Últimos Movimientos</h3>
          <p className="text-xs text-slate-400">Tus últimas 5 transacciones con fecha exacta</p>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>Ver todos</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-2" id="expense-list-container">
        {last5Expenses.map((expense) => {
          const catMeta = CATEGORIES[expense.category] || CATEGORIES.otros;
          
          return (
            <button
              key={expense.id} 
              onClick={() => onSelectExpense(expense)}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/80 rounded-2xl transition-all duration-200 text-left cursor-pointer border border-transparent hover:border-slate-100"
              id={`expense-row-${expense.id}`}
            >
              {/* Category & Description */}
              <div className="flex items-center gap-3.5 min-w-0 pr-2">
                <div className={`w-10 h-10 rounded-xl border border-slate-100 ${catMeta.bgClass} flex items-center justify-center shrink-0`}>
                  <CategoryIcon iconName={catMeta.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{expense.description}</p>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {formatDateSpanish(expense.date)} • <span className="text-slate-400">{catMeta.label}</span>
                  </p>
                </div>
              </div>

              {/* Day Badge & Amount */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="hidden sm:flex items-center gap-1 bg-slate-100/80 text-slate-700 font-bold px-2.5 py-1 rounded-xl text-[11px] border border-slate-200/50">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  {formatDateShortSpanish(expense.date)}
                </span>
                <span className="font-mono font-bold text-slate-900 text-sm sm:text-base">
                  -{formatCurrency(expense.amount)}
                </span>
              </div>
            </button>
          );
        })}

        {last5Expenses.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            No hay gastos registrados en este periodo.
          </div>
        )}
      </div>
    </div>
  );
}
