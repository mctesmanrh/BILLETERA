import React, { useState } from "react";
import { Expense } from "../types";
import { CATEGORIES, formatCurrency, formatDateSpanish } from "../data";
import { ArrowLeft, Calendar, Tag, FileText, DollarSign, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import * as Icons from "lucide-react";

interface ExpenseDetailProps {
  expense: Expense;
  onBack: () => void;
  onDelete?: (id: string) => void;
}

// Dynamic Lucide icon helper
const CategoryIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = (Icons as any)[iconName];
  if (!IconComponent) return <Icons.Tag className={className} />;
  return <IconComponent className={className} />;
};

export default function ExpenseDetail({ expense, onBack, onDelete }: ExpenseDetailProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const catMeta = CATEGORIES[expense.category] || CATEGORIES.otros;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm max-w-md mx-auto"
    >
      {/* Header back button */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-50 text-slate-600 rounded-xl transition-colors border border-slate-100 flex items-center justify-center gap-1.5 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver</span>
        </button>
        
        <span className="text-[10px] font-mono bg-slate-50 border border-slate-100 text-slate-400 px-3 py-1 rounded-full">
          ID: {expense.id}
        </span>
      </div>

      {/* Detail card receipt simulation */}
      <div className="border border-dashed border-slate-200 rounded-3xl p-6 mb-6 bg-slate-50/50 space-y-6">
        <div className="text-center pb-6 border-b border-dashed border-slate-200">
          <div className={`w-12 h-12 rounded-2xl border border-slate-100 ${catMeta.bgClass} flex items-center justify-center mx-auto mb-3`}>
            <CategoryIcon iconName={catMeta.icon} className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{catMeta.label}</span>
          <h2 className="text-3xl font-bold text-slate-900 mt-2 font-mono">
            -{formatCurrency(expense.amount)}
          </h2>
        </div>

        {/* Info Rows */}
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Descripción</span>
            <p className="text-sm text-slate-800 font-semibold">{expense.description}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Fecha de Registro</span>
            <p className="text-sm text-slate-700 font-medium">{formatDateSpanish(expense.date)}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Categoría Principal</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${catMeta.bgClass} border`}>
                {catMeta.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        {onDelete && (
          <div className="transition-all duration-300">
            {!isConfirming ? (
              <button
                type="button"
                onClick={() => setIsConfirming(true)}
                className="w-full py-3.5 px-4 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-xs rounded-2xl transition-colors flex items-center justify-center gap-2 border border-red-100"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar Gasto
              </button>
            ) : (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 space-y-3 text-center">
                <p className="text-xs text-red-700 font-medium">
                  ¿Estás seguro de que deseas eliminar este gasto de tu billetera? Se enviará a la papelera.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfirming(false)}
                    className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                  >
                    No, conservar
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(expense.id)}
                    className="flex-1 py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Sí, eliminar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {!isConfirming && (
          <button
            onClick={onBack}
            className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-2xl transition-colors"
          >
            Aceptar
          </button>
        )}
      </div>
    </motion.div>
  );
}
