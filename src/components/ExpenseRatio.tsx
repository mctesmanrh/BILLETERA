import React from "react";
import { formatCurrency } from "../data";
import { Flame, CheckCircle, AlertTriangle, PieChart } from "lucide-react";

interface ExpenseRatioProps {
  monthlyBudget: number;
  totalSpent: number;
  availableBalance: number;
}

export default function ExpenseRatio({ monthlyBudget, totalSpent, availableBalance }: ExpenseRatioProps) {
  // Prevent division by zero
  const safeBudget = monthlyBudget > 0 ? monthlyBudget : 1;
  const spentPercent = Math.min(Math.max((totalSpent / safeBudget) * 100, 0), 100);
  const availablePercent = Math.max(100 - spentPercent, 0);

  // Determine bar color based on percentage
  let spentBarColor = "bg-indigo-600";
  let spentTextColor = "text-indigo-600";
  if (spentPercent > 90 || availableBalance < 0) {
    spentBarColor = "bg-rose-500";
    spentTextColor = "text-rose-600";
  } else if (spentPercent > 70) {
    spentBarColor = "bg-amber-500";
    spentTextColor = "text-amber-600";
  }

  // Ratio spent vs budget
  const percentDisplay = ((totalSpent / safeBudget) * 100).toFixed(1);

  return (
    <div id="expense-ratio-card" className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
              <PieChart className="w-4 h-4 text-slate-700" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm md:text-base">Barra de Presupuesto Consumido</h3>
              <p className="text-xs text-slate-400">Progreso del gasto respecto al límite asignado</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">% Consumido</span>
            <div className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-lg inline-block bg-slate-100 ${spentTextColor}`} id="ratio-value">
              {percentDisplay}%
            </div>
          </div>
        </div>

        {/* Thick, Clear Progress Bar with Markers */}
        <div className="space-y-2 mt-4">
          <div className="relative w-full h-6 bg-slate-100 rounded-2xl overflow-hidden p-1 flex border border-slate-200/60" id="ratio-progress-bar">
            <div 
              className={`h-full ${spentBarColor} rounded-xl transition-all duration-500 flex items-center justify-end px-2`} 
              style={{ width: `${Math.max(spentPercent, 4)}%` }}
              title={`Gastado: ${percentDisplay}%`}
            >
              {spentPercent >= 20 && (
                <span className="text-[10px] font-mono font-bold text-white drop-shadow-xs">
                  {percentDisplay}%
                </span>
              )}
            </div>
          </div>

          {/* Scale Ticks (0%, 25%, 50%, 75%, 100%) */}
          <div className="flex justify-between px-1 text-[10px] font-mono font-semibold text-slate-400">
            <span>0%</span>
            <span>25%</span>
            <span>50%</span>
            <span>75%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Detailed Breakdown Legend */}
        <div className="mt-5 space-y-2.5 text-xs bg-slate-50/60 p-4 rounded-2xl border border-slate-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 ${spentBarColor} rounded-full inline-block`} />
              <span className="text-slate-600 font-semibold">Gasto Acumulado:</span>
            </div>
            <div className="font-mono text-slate-900 font-bold">
              {formatCurrency(totalSpent)}
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-slate-800 rounded-full inline-block" />
              <span className="text-slate-600 font-semibold">Disponible Restante:</span>
            </div>
            <div className="font-mono text-slate-900 font-bold">
              {formatCurrency(availableBalance > 0 ? availableBalance : 0)}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200/60 flex justify-between items-center text-[11px]">
            <span className="text-slate-400 font-medium">Límite Total Mensual:</span>
            <span className="font-mono text-slate-700 font-bold">{formatCurrency(monthlyBudget)}</span>
          </div>
        </div>
      </div>

      {/* Insight / Status Box */}
      <div className={`mt-4 p-3.5 rounded-2xl border flex items-start gap-2.5 ${
        availableBalance < 0 
          ? "bg-rose-50 border-rose-200/80 text-rose-800" 
          : spentPercent > 80
          ? "bg-amber-50 border-amber-200/80 text-amber-900"
          : "bg-emerald-50 border-emerald-200/80 text-emerald-900"
      }`}>
        {availableBalance < 0 ? (
          <>
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed font-medium">
              <strong>Atención:</strong> Has superado tu presupuesto total configurado.
            </p>
          </>
        ) : spentPercent > 80 ? (
          <>
            <Flame className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed font-medium">
              <strong>Presupuesto elevado:</strong> Llevas consumido más del 80% de tu dinero.
            </p>
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <p className="text-[11px] leading-relaxed font-medium">
              <strong>Presupuesto bajo control:</strong> Tienes disponible el {availablePercent.toFixed(0)}% de tu fondo mensual.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
