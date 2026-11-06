import React from "react";
import { formatCurrency, formatMonthYearSpanish } from "../data";
import { Minus, Equal } from "lucide-react";
import { motion } from "motion/react";

interface MetricCardsProps {
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
  activeMonth: string;
}

export default function MetricCards({
  monthlyBudget,
  totalSpent,
  availableBalance,
  activeMonth,
}: MetricCardsProps) {
  const isNegative = availableBalance < 0;
  const safeBudget = monthlyBudget > 0 ? monthlyBudget : 1;
  const spentPercentage = Math.round((totalSpent / safeBudget) * 100);

  return (
    <div className="space-y-6">
      {/* Clean Minimalism Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="metrics-grid">
        
        {/* Presupuesto Inicial */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          id="metric-card-budget"
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Presupuesto</p>
            <h2 className="text-3xl font-light text-slate-800 font-sans tracking-tight" id="metric-budget-value">
              {formatCurrency(monthlyBudget)}
            </h2>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 font-sans font-medium">
            Establecido para {formatMonthYearSpanish(activeMonth)}
          </p>
        </motion.div>

        {/* Total Gastado */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          id="metric-card-spent"
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-xs flex flex-col justify-between"
        >
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Gastado</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl font-light text-rose-500 font-sans tracking-tight" id="metric-spent-value">
                {formatCurrency(totalSpent)}
              </h2>
              <span className="text-xs text-slate-400 font-mono">/ {spentPercentage}%</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 mt-4 font-sans font-medium">Gastos registrados del mes</p>
        </motion.div>

        {/* Saldo Disponible */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          id="metric-card-available"
          className={`p-6 rounded-3xl transition-all duration-300 ${
            isNegative 
              ? "bg-red-950 border border-red-900 text-white shadow-xl shadow-red-950/10" 
              : "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
          }`}
        >
          <div>
            <p className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isNegative ? "text-red-400" : "text-slate-400"}`}>
              Disponible
            </p>
            <h2 className={`text-3xl font-bold font-sans tracking-tight ${isNegative ? "text-red-300 animate-pulse" : "text-white"}`} id="metric-available-value">
              {formatCurrency(availableBalance)}
            </h2>
          </div>
          <p className={`text-[11px] mt-4 font-sans font-medium ${isNegative ? "text-red-300" : "text-slate-400"}`}>
            {isNegative ? "Excedido de presupuesto" : "Saldo restante disponible"}
          </p>
        </motion.div>
        
      </div>

      {/* Visual formula bar */}
      <div id="formula-bar" className="bg-white border border-slate-100 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-around gap-4 md:gap-2 shadow-xs">
        <div className="text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Presupuesto</div>
          <div className="font-sans text-sm font-semibold text-slate-700">{formatCurrency(monthlyBudget)}</div>
        </div>

        <div className="text-slate-300">
          <Minus className="w-4 h-4 stroke-[2]" />
        </div>

        <div className="text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Gastos</div>
          <div className="font-sans text-sm font-semibold text-rose-500">{formatCurrency(totalSpent)}</div>
        </div>

        <div className="text-slate-300">
          <Equal className="w-4 h-4 stroke-[2]" />
        </div>

        <div className="text-center">
          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Saldo Disponible</div>
          <div className={`font-sans text-sm font-bold ${isNegative ? "text-red-600" : "text-emerald-600"}`}>
            {formatCurrency(availableBalance)}
          </div>
        </div>
      </div>
    </div>
  );
}
