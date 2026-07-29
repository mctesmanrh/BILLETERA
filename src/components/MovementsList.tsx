import React, { useState } from "react";
import { Expense } from "../types";
import { CATEGORIES, formatCurrency, formatDateSpanish } from "../data";
import { ArrowLeft, Search, Filter, Calendar, FileText, ChevronRight, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as Icons from "lucide-react";

interface MovementsListProps {
  expenses: Expense[];
  onSelectExpense: (expense: Expense) => void;
  onBack: () => void;
}

// Dynamic Lucide icon helper
const CategoryIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = (Icons as any)[iconName];
  if (!IconComponent) return <Icons.Tag className={className} />;
  return <IconComponent className={className} />;
};

export default function MovementsList({ expenses, onSelectExpense, onBack }: MovementsListProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [isTopCategoriesOpen, setIsTopCategoriesOpen] = useState<boolean>(false);

  // Sort chronologically (newest first)
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Apply filters
  const filteredExpenses = sortedExpenses.filter((expense) => {
    const matchesSearch = expense.description
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Sum total spent by category for Top 5
  const categoryTotals = expenses.reduce((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + expense.amount;
    return acc;
  }, {} as Record<string, number>);

  const totalSpentAll = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Sort and take top 5 categories
  const topCategories = Object.entries(categoryTotals)
    .filter(([_, total]) => total > 0)
    .map(([categoryKey, total]) => {
      const catMeta = CATEGORIES[categoryKey] || CATEGORIES.otros;
      return {
        key: categoryKey,
        label: catMeta.label,
        total,
        icon: catMeta.icon,
        bgClass: catMeta.bgClass,
        textClass: catMeta.textClass,
        color: catMeta.color,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm max-w-2xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors border border-slate-100"
            title="Volver"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-slate-800">Todos los Movimientos</h2>
            <p className="text-xs text-slate-400">Lista completa de gastos cronológicos</p>
          </div>
        </div>

        {/* Action Controls: Top 5 Toggle and Count Badge */}
        <div className="flex items-center gap-2">
          {topCategories.length > 0 && (
            <button
              onClick={() => setIsTopCategoriesOpen(!isTopCategoriesOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer select-none ${
                isTopCategoriesOpen
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80"
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
              <span>Ver Top 5</span>
              {isTopCategoriesOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          )}
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl whitespace-nowrap">
            {filteredExpenses.length} {filteredExpenses.length === 1 ? "gasto" : "gastos"}
          </span>
        </div>
      </div>

      {/* Top 5 Categorías de Mayor Gasto (Collapsible with AnimatePresence) */}
      <AnimatePresence>
        {isTopCategoriesOpen && topCategories.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0, marginBottom: 0 }}
            animate={{ height: "auto", opacity: 1, marginBottom: 32 }}
            exit={{ height: 0, opacity: 0, marginBottom: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/80">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Top 5 Categorías de Mayor Gasto
                  </h3>
                  <p className="text-[11px] text-slate-400">Distribución de tu dinero en este periodo</p>
                </div>
                <span className="text-[10px] font-mono font-bold bg-slate-200/50 text-slate-600 px-2.5 py-0.5 rounded-md">
                  Total: {formatCurrency(totalSpentAll)}
                </span>
              </div>

              <div className="space-y-3.5">
                {topCategories.map((cat, index) => {
                  const percentage = totalSpentAll > 0 ? (cat.total / totalSpentAll) * 100 : 0;
                  return (
                    <div key={cat.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono font-bold text-slate-400 text-[11px] w-4">
                            #{index + 1}
                          </span>
                          <div className={`w-6 h-6 rounded-md ${cat.bgClass} flex items-center justify-center shrink-0`}>
                            <CategoryIcon iconName={cat.icon} className="w-3 h-3" />
                          </div>
                          <span className="font-semibold text-slate-700 truncate">{cat.label}</span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-900">
                            {formatCurrency(cat.total)}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400">
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${percentage}%`,
                            backgroundColor: cat.color || "#64748b",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filter / Search Bar */}
      <div className="space-y-4 mb-6">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Buscar por descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-100 bg-slate-50/50 text-slate-800 text-sm focus:outline-hidden focus:ring-4 focus:ring-slate-100 focus:border-slate-300 transition-all placeholder:text-slate-400 font-medium"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
              selectedCategory === "all"
                ? "bg-slate-900 border-slate-900 text-white"
                : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
            }`}
          >
            Todos
          </button>
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const isSelected = selectedCategory === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 border ${
                  isSelected
                    ? "bg-slate-900 border-slate-900 text-white"
                    : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chronological List of Expenses grouped by Day */}
      <div className="space-y-6" id="complete-movements-container">
        {(() => {
          // Group filtered expenses by date
          const grouped = filteredExpenses.reduce((acc, expense) => {
            const dateKey = expense.date || "2026-07-01";
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(expense);
            return acc;
          }, {} as Record<string, Expense[]>);

          const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

          if (sortedDates.length === 0) {
            return (
              <div className="text-center py-16 text-slate-400 text-sm">
                No se encontraron gastos con los filtros aplicados.
              </div>
            );
          }

          return sortedDates.map((dateKey) => {
            const dayExpenses = grouped[dateKey];
            const dayTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

            return (
              <div key={dateKey} className="space-y-2">
                {/* Day Header Banner */}
                <div className="flex items-center justify-between bg-slate-100/70 px-4 py-2.5 rounded-2xl border border-slate-200/50 sticky top-0 backdrop-blur-xs z-10">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                    <Calendar className="w-4 h-4 text-indigo-600" />
                    <span className="capitalize">{formatDateSpanish(dateKey)}</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200/60 shadow-2xs">
                    Total día: {formatCurrency(dayTotal)}
                  </span>
                </div>

                {/* Expenses for this specific day */}
                <div className="space-y-1 pl-1">
                  {dayExpenses.map((expense) => {
                    const catMeta = CATEGORIES[expense.category] || CATEGORIES.otros;
                    return (
                      <button
                        key={expense.id}
                        onClick={() => onSelectExpense(expense)}
                        className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50/80 rounded-2xl transition-all duration-200 border border-transparent hover:border-slate-100 text-left cursor-pointer"
                        id={`movement-row-${expense.id}`}
                      >
                        <div className="flex items-center gap-3.5 min-w-0 pr-2">
                          <div className={`w-10 h-10 rounded-xl border border-slate-100 ${catMeta.bgClass} flex items-center justify-center shrink-0`}>
                            <CategoryIcon iconName={catMeta.icon} className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 text-sm truncate">{expense.description}</p>
                            <p className="text-[11px] text-slate-400">
                              {catMeta.label}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono font-bold text-slate-900 text-sm md:text-base">
                            -{formatCurrency(expense.amount)}
                          </span>
                          <ChevronRight className="w-4 h-4 text-slate-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}
      </div>
    </motion.div>
  );
}
