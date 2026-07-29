import React from "react";
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DailyExpenseSummary } from "../types";
import { formatCurrency } from "../data";
import { Calendar, TrendingUp } from "lucide-react";

interface DailyChartProps {
  data: DailyExpenseSummary[];
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const item: DailyExpenseSummary = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white rounded-2xl p-3.5 shadow-xl border border-slate-800 font-sans text-xs space-y-1 min-w-[170px]">
        <div className="flex items-center gap-1.5 text-slate-400 font-medium text-[11px]">
          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
          <span>{item.fullDateLabel || item.dateLabel}</span>
        </div>
        <div className="pt-1 flex items-baseline justify-between gap-3">
          <span className="text-[11px] text-slate-400">Gasto total:</span>
          <span className="font-mono text-sm font-bold text-white">
            {formatCurrency(item.amount)}
          </span>
        </div>
        {item.count > 0 && (
          <p className="text-[10px] text-slate-400 font-medium">
            {item.count} {item.count === 1 ? "transacción realizada" : "transacciones realizadas"}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export default function DailyChart({ data }: DailyChartProps) {
  const maxSpent = Math.max(...data.map(d => d.amount), 50);
  
  // Compute metrics
  const totalSum = data.reduce((sum, d) => sum + d.amount, 0);
  const activeDaysCount = data.filter(d => d.amount > 0).length;
  const averageSpend = totalSum / (data.length || 1);
  const maxDay = data.reduce<DailyExpenseSummary>(
    (max, d) => (d.amount > max.amount ? d : max),
    data[0] || { amount: 0, dateLabel: "", fullDateLabel: "", rawDate: "", count: 0 }
  );

  return (
    <div id="daily-chart-card" className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">Barras de Gastos por Día</h3>
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-indigo-100/60">
              {data.length} días
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Monto acumulado por cada día calendario
          </p>
        </div>

        {/* Quick KPI stats pill */}
        <div className="flex items-center gap-3 text-xs bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-100/80 self-start sm:self-auto">
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Promedio</span>
            <span className="font-mono font-bold text-slate-800">{formatCurrency(averageSpend)}/día</span>
          </div>
          <div className="h-6 w-px bg-slate-200/80" />
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Días activos</span>
            <span className="font-mono font-bold text-slate-800">{activeDaysCount} de {data.length}</span>
          </div>
        </div>
      </div>

      {/* Bar Chart Container */}
      <div className="h-64 w-full" id="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
            barCategoryGap="18%"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="dateLabel" 
              tickLine={false} 
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'sans-serif', fontWeight: 600 }}
              dy={5}
            />
            <YAxis 
              tickLine={false} 
              axisLine={false}
              domain={[0, Math.ceil(maxSpent * 1.15)]}
              tickFormatter={(val) => val >= 1000 ? `$${Math.round(val / 1000)}k` : `$${val}`}
              tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 }}
            />
            <Tooltip 
              content={<CustomTooltip />} 
              cursor={{ fill: 'rgba(241, 245, 249, 0.7)' }} 
            />
            <Bar 
              dataKey="amount" 
              radius={[8, 8, 2, 2]}
            >
              {data.map((entry, index) => {
                // Color intensity based on spent ratio
                const ratio = maxSpent > 0 ? entry.amount / maxSpent : 0;
                let fillColor = "#cbd5e1"; // zero / very low
                if (entry.amount > 0) {
                  if (ratio > 0.7) fillColor = "#0f172a"; // high spend -> dark slate
                  else if (ratio > 0.35) fillColor = "#334155"; // medium spend -> slate 700
                  else fillColor = "#64748b"; // light spend -> slate 500
                }
                return <Cell key={`cell-${index}`} fill={fillColor} className="transition-all hover:opacity-80 cursor-pointer" />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Info Legend */}
      {maxDay && maxDay.amount > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-slate-700" />
            <span>Día con mayor gasto: <strong className="text-slate-800">{maxDay.fullDateLabel || maxDay.dateLabel}</strong></span>
          </div>
          <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
            {formatCurrency(maxDay.amount)}
          </span>
        </div>
      )}
    </div>
  );
}
