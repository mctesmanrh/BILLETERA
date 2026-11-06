import React, { useState, useEffect } from "react";
import { Expense } from "../types";
import {
  CATEGORIES,
  formatMonthYearSpanish,
  getColombiaTodayDateString,
  getMonthEndDateString,
} from "../data";
import { ArrowLeft, Save, Calendar, FileText, Clock } from "lucide-react";
import { motion } from "motion/react";

interface NewExpenseFormProps {
  onSave: (expense: Omit<Expense, "id">) => Promise<void>;
  onCancel: () => void;
  activeMonth: string;
}

export default function NewExpenseForm({
  onSave,
  onCancel,
  activeMonth,
}: NewExpenseFormProps) {
  const [amount, setAmount] = useState<string>("");
  const [displayAmount, setDisplayAmount] = useState<string>("");
  const [category, setCategory] = useState<string>("alimentacion");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    const today = getColombiaTodayDateString();
    return today.startsWith(activeMonth.slice(0, 7)) ? today : activeMonth;
  });
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const todayCo = getColombiaTodayDateString();
    if (!date.startsWith(activeMonth.slice(0, 7))) {
      setDate(todayCo.startsWith(activeMonth.slice(0, 7)) ? todayCo : activeMonth);
    }
  }, [activeMonth, date]);

  const monthEnd = getMonthEndDateString(activeMonth);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Por favor ingresa un monto válido mayor a 0");
      return;
    }
    if (!description.trim()) {
      setError("Por favor escribe una descripción");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        amount: parsedAmount,
        category,
        description: description.trim(),
        date,
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "No fue posible guardar el gasto.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm max-w-lg mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors border border-slate-100"
          title="Volver"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Nuevo Gasto</h2>
          <p className="text-xs text-slate-400">
            Registra tu pago de {formatMonthYearSpanish(activeMonth)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Big Amount Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Monto (COP)</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-light text-slate-400 font-mono">$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="0"
              value={displayAmount}
              onChange={(e) => {
                setError("");
                // Clear everything except digits
                const rawVal = e.target.value.replace(/\D/g, "");
                if (rawVal === "") {
                  setDisplayAmount("");
                  setAmount("");
                  return;
                }
                const numericValue = parseInt(rawVal, 10);
                // Format numeric value with dots as thousands separator (e.g. 50.000)
                const formatted = new Intl.NumberFormat("es-CO", {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(numericValue);

                setDisplayAmount(formatted);
                setAmount(rawVal);
              }}
              className="w-full pl-10 pr-4 py-4 rounded-2xl border border-slate-200 text-slate-800 font-mono font-bold text-2xl focus:outline-hidden focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all placeholder:text-slate-300"
              autoFocus
            />
          </div>
        </div>

        {/* Category Grid Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Categoría</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Object.entries(CATEGORIES).map(([key, cat]) => {
              const isSelected = category === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-2xl border text-center transition-all ${
                    isSelected
                      ? "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10"
                      : "border-slate-100 bg-slate-50/50 text-slate-600 hover:bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <span className="text-xs font-semibold">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">¿En qué se fue la plata?</label>
          <div className="relative">
            <span className="absolute left-4 top-3.5 text-slate-400">
              <FileText className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Ej. Almuerzo corrientazo, Taxi al trabajo, Zapatos nuevos"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setError("");
              }}
              className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm focus:outline-hidden focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all placeholder:text-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Fecha del Gasto</label>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-indigo-100">
              <Clock className="w-3 h-3 text-indigo-500" />
              Hora Colombia (COT)
            </span>
          </div>
          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-3.5 text-slate-400">
                <Calendar className="w-4 h-4" />
              </span>
              <input
                type="date"
                value={date}
                min={activeMonth}
                max={monthEnd}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 text-slate-800 text-sm focus:outline-hidden focus:ring-4 focus:ring-slate-100 focus:border-slate-400 transition-all font-mono font-medium"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                const today = getColombiaTodayDateString();
                setDate(today.startsWith(activeMonth.slice(0, 7)) ? today : activeMonth);
              }}
              className="px-3 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl transition-colors shrink-0"
              title="Restablecer a la fecha de hoy en Colombia"
            >
              Hoy
            </button>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1 py-3.5 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-700 font-semibold text-sm rounded-2xl transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 py-3.5 px-4 bg-slate-900 hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60 text-white font-bold text-sm rounded-2xl shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Guardando…" : "Guardar Gasto"}
          </button>
        </div>
      </form>
    </motion.div>
  );
}
