import React, { useState } from "react";
import { Expense } from "../types";
import { CATEGORIES, formatCurrency, formatDateSpanish } from "../data";
import { ArrowLeft, RotateCcw, Trash2, Trash, AlertCircle } from "lucide-react";
import * as Icons from "lucide-react";
import { motion } from "motion/react";

interface TrashBinProps {
  deletedExpenses: Expense[];
  onRestore: (expense: Expense) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  onBack: () => void;
}

// Dynamic Lucide icon helper
const CategoryIcon = ({ iconName, className }: { iconName: string; className?: string }) => {
  const IconComponent = (Icons as any)[iconName];
  if (!IconComponent) return <Icons.Tag className={className} />;
  return <IconComponent className={className} />;
};

export default function TrashBin({
  deletedExpenses,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  onBack,
}: TrashBinProps) {
  const [isConfirmingEmpty, setIsConfirmingEmpty] = useState(false);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Total money in trash
  const totalTrashAmount = deletedExpenses.reduce((sum, exp) => sum + exp.amount, 0);

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
            <h2 className="text-xl font-bold text-slate-800">Papelera de Reciclaje</h2>
            <p className="text-xs text-slate-400">Restaura gastos borrados o elimínalos para siempre</p>
          </div>
        </div>

        {deletedExpenses.length > 0 && (
          <div className="shrink-0 flex items-center">
            {!isConfirmingEmpty ? (
              <button
                onClick={() => setIsConfirmingEmpty(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Trash className="w-3.5 h-3.5" />
                Vaciar Papelera
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-red-50/50 p-1.5 rounded-xl border border-red-100">
                <span className="text-[10px] text-red-700 font-bold px-2">¿Confirmas vaciar todo?</span>
                <button
                  onClick={() => setIsConfirmingEmpty(false)}
                  className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg transition-colors border border-slate-200"
                >
                  No
                </button>
                <button
                  onClick={() => {
                    onEmptyTrash();
                    setIsConfirmingEmpty(false);
                  }}
                  className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg transition-colors"
                >
                  Sí, vaciar
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metric bar of deleted items */}
      {deletedExpenses.length > 0 && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-200/50 rounded-xl flex items-center justify-center text-slate-500">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total en Papelera</p>
              <p className="font-mono font-bold text-slate-700 text-sm">{formatCurrency(totalTrashAmount)}</p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-lg">
            {deletedExpenses.length} {deletedExpenses.length === 1 ? "ítem" : "ítems"}
          </span>
        </div>
      )}

      {/* Deleted Expenses List */}
      <div className="space-y-2" id="trash-list-container">
        {deletedExpenses.map((expense) => {
          const catMeta = CATEGORIES[expense.category] || CATEGORIES.otros;
          const isConfirmingDeleteThis = confirmingDeleteId === expense.id;

          return (
            <div
              key={expense.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all gap-4"
              id={`trash-row-${expense.id}`}
            >
              {/* Category & Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-10 h-10 rounded-xl border border-slate-100 ${catMeta.bgClass} flex items-center justify-center shrink-0`}>
                  <CategoryIcon iconName={catMeta.icon} className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-700 text-sm truncate">{expense.description}</p>
                  <p className="text-[11px] text-slate-400 uppercase tracking-tighter">
                    {catMeta.label} • {formatDateSpanish(expense.date)}
                  </p>
                </div>
              </div>

              {/* Amount and actions */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                <span className="font-mono font-bold text-slate-500 text-base">
                  {formatCurrency(expense.amount)}
                </span>

                <div className="flex items-center gap-2">
                  {!isConfirmingDeleteThis ? (
                    <>
                      {/* Restore button */}
                      <button
                        onClick={() => onRestore(expense)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-xs font-bold rounded-xl transition-all cursor-pointer"
                        title="Restaurar gasto a la lista principal"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Restaurar</span>
                      </button>

                      {/* Permanent Delete Trigger */}
                      <button
                        onClick={() => setConfirmingDeleteId(expense.id)}
                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-xl transition-all cursor-pointer"
                        title="Eliminar permanentemente"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 bg-red-50 p-1 rounded-xl border border-red-100">
                      <span className="text-[9px] text-red-700 font-bold px-1">¿Eliminar para siempre?</span>
                      <button
                        onClick={() => setConfirmingDeleteId(null)}
                        className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-600 text-[9px] font-bold rounded-lg border border-slate-200 transition-colors"
                      >
                        No
                      </button>
                      <button
                        onClick={() => {
                          onPermanentDelete(expense.id);
                          setConfirmingDeleteId(null);
                        }}
                        className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white text-[9px] font-bold rounded-lg transition-colors"
                      >
                        Sí, borrar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {deletedExpenses.length === 0 && (
          <div className="text-center py-16 text-slate-400 text-sm flex flex-col items-center justify-center gap-3 bg-slate-50/30 rounded-3xl border border-dashed border-slate-200">
            <Trash className="w-8 h-8 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-600">Tu papelera está vacía</p>
              <p className="text-xs text-slate-400 mt-1">Los gastos que borres aparecerán aquí para restaurarlos si lo deseas.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
