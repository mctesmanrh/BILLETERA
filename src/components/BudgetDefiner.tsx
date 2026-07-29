import React from "react";
import { Sliders } from "lucide-react";

interface BudgetDefinerProps {
  monthlyBudget: number;
  onChangeBudget: (budget: number) => void;
}

export default function BudgetDefiner({ monthlyBudget, onChangeBudget }: BudgetDefinerProps) {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    onChangeBudget(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    onChangeBudget(value);
  };

  return (
    <div id="budget-definer-card" className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100">
          <Sliders className="w-4 h-4" id="budget-icon" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 text-sm md:text-base">Límite Mensual</h3>
          <p className="text-xs text-slate-400">Establece tu presupuesto objetivo</p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Input field and range slider */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-sm">$</span>
            <input
              id="budget-numeric-input"
              type="number"
              min="50000"
              max="20000000"
              value={monthlyBudget === 0 ? "" : monthlyBudget}
              onChange={handleInputChange}
              className="w-full pl-8 pr-4 py-3 rounded-2xl border border-slate-200 text-slate-800 font-mono font-semibold focus:outline-hidden focus:ring-4 focus:ring-slate-100 focus:border-slate-400 text-sm transition-all"
              placeholder="0"
            />
          </div>
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono">COP</span>
        </div>

        <div>
          <input
            id="budget-range-slider"
            type="range"
            min="200000"
            max="5000000"
            step="50000"
            value={monthlyBudget}
            onChange={handleSliderChange}
            className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800 focus:outline-hidden"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-2 font-mono uppercase tracking-wider">
            <span>$ 200k</span>
            <span>$ 2.6M</span>
            <span>$ 5.0M</span>
          </div>
        </div>
      </div>
    </div>
  );
}
