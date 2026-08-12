import React, { useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  FileClock,
  FileJson,
  FileSpreadsheet,
  LoaderCircle,
  ShieldAlert,
  Upload,
  X,
} from "lucide-react";
import { formatCurrency, formatMonthYearSpanish } from "../data";
import { downloadMonthlyReportDocument } from "../monthlyReportDocument";
import type { Expense, MonthlyReport, MonthlyReportSummary } from "../types";

interface BackupManagerProps {
  monthlyBudget: number;
  expenses: Expense[];
  deletedExpenses: Expense[];
  activeMonth: string;
  monthlyReports: MonthlyReportSummary[];
  onImportData: (data: { monthlyBudget: number; expenses: Expense[]; deletedExpenses: Expense[] }) => Promise<void>;
  onLoadMonthlyReport: (monthStart: string) => Promise<MonthlyReport>;
  isOpen: boolean;
  onClose: () => void;
}

export default function BackupManager({
  monthlyBudget,
  expenses,
  deletedExpenses,
  activeMonth,
  monthlyReports,
  onImportData,
  onLoadMonthlyReport,
  isOpen,
  onClose,
}: BackupManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [downloadingMonth, setDownloadingMonth] = useState<string | null>(null);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadMonthlyReport = async (monthStart: string) => {
    setDownloadingMonth(monthStart);
    try {
      const report = await onLoadMonthlyReport(monthStart);
      downloadMonthlyReportDocument(report);
      showNotification(
        `Informe de ${formatMonthYearSpanish(monthStart)} descargado correctamente.`,
      );
    } catch (error) {
      showNotification(
        error instanceof Error
          ? error.message
          : "No fue posible descargar el informe mensual.",
      );
    } finally {
      setDownloadingMonth(null);
    }
  };

  // 1. Export JSON backup file
  const handleExportJson = () => {
    const backupData = {
      version: "2.0",
      exportDate: new Date().toISOString(),
      activeMonth,
      monthlyBudget,
      expenses,
      deletedExpenses,
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
    const downloadAnchor = document.createElement("a");
    const todayStr = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `respaldo_mis_gastos_${todayStr}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showNotification("Copia de seguridad (.json) descargada exitosamente en tu PC.");
  };

  // 2. Export CSV file for Excel
  const handleExportCsv = () => {
    if (expenses.length === 0) {
      showNotification("No hay gastos registrados para exportar a Excel.");
      return;
    }

    const headers = ["ID", "Fecha", "Categoria", "Descripcion", "Monto (COP)"];
    const rows = expenses.map((exp) => [
      exp.id,
      exp.date,
      exp.category,
      `"${(exp.description || "").replace(/"/g, '""')}"`,
      exp.amount,
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const downloadAnchor = document.createElement("a");
    const todayStr = new Date().toISOString().split("T")[0];
    downloadAnchor.setAttribute("href", encodedUri);
    downloadAnchor.setAttribute("download", `gastos_excel_${todayStr}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    showNotification("Archivo CSV generado y descargado para Excel/Google Sheets.");
  };

  // 3. Import JSON backup file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);

        let importedBudget = monthlyBudget;
        let importedExpenses: Expense[] = [];
        let importedDeleted: Expense[] = [];

        if (typeof parsed.monthlyBudget === "number") {
          importedBudget = parsed.monthlyBudget;
        }

        if (Array.isArray(parsed.expenses)) {
          importedExpenses = parsed.expenses;
        } else if (Array.isArray(parsed)) {
          // If the user uploaded an array of expenses directly
          importedExpenses = parsed;
        }

        if (Array.isArray(parsed.deletedExpenses)) {
          importedDeleted = parsed.deletedExpenses;
        }

        await onImportData({
          monthlyBudget: importedBudget,
          expenses: importedExpenses,
          deletedExpenses: importedDeleted,
        });

        showNotification(`¡Restauración exitosa! Se cargaron ${importedExpenses.length} gastos.`);
      } catch (err) {
        console.error("Error al leer archivo JSON:", err);
        showNotification(
          err instanceof Error
            ? err.message
            : "El archivo seleccionado no es una copia de seguridad JSON válida.",
        );
      }
    };

    reader.readAsText(file);
    // Reset file input value so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white border border-slate-100 rounded-[28px] max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 my-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Copias e informes mensuales</h2>
              <p className="text-xs text-slate-500">Respalda el mes activo o descarga periodos cerrados</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Data protection notice */}
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-amber-950">Protección adicional de tus datos:</span>
            PostgreSQL conserva la información principal. La copia <span className="font-semibold">.json</span> es
            un respaldo adicional para recuperar o trasladar la billetera si pierdes acceso al servidor.
          </div>
        </div>

        <section className="space-y-3" aria-labelledby="monthly-reports-title">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 id="monthly-reports-title" className="text-sm font-bold text-slate-800">
                Informes de meses cerrados
              </h3>
              <p className="text-xs text-slate-400">
                Se crean automáticamente al comenzar cada mes.
              </p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {monthlyReports.length} {monthlyReports.length === 1 ? "informe" : "informes"}
            </span>
          </div>

          {monthlyReports.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-xs text-slate-500">
              El primer informe aparecerá después del próximo cierre mensual.
            </div>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {monthlyReports.map((report) => {
                const isDownloading = downloadingMonth === report.monthStart;
                return (
                  <div
                    key={report.monthStart}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                        <FileClock className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {formatMonthYearSpanish(report.monthStart)}
                        </p>
                        <p className="text-xs text-slate-500">
                          {report.expenseCount} movimientos · {formatCurrency(report.totalSpent)} gastados
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isDownloading}
                      onClick={() => handleDownloadMonthlyReport(report.monthStart)}
                      className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Descargar informe
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Notification Toast inside modal */}
        {notification && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium p-3 rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        {/* Action Options Grid */}
        <div className="space-y-3">
          
          {/* 1. Download Backup JSON */}
          <button
            onClick={handleExportJson}
            className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 block">Descargar Copia (.json)</span>
                <span className="text-xs text-slate-400">Guarda un archivo de respaldo con tu presupuesto y gastos.</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-800 shrink-0 ml-2" />
          </button>

          {/* 2. Upload Backup JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 block">Cargar Copia desde tu PC (.json)</span>
                <span className="text-xs text-slate-400">Selecciona tu archivo guardado para restaurar todos tus datos.</span>
              </div>
            </div>
            <Upload className="w-4 h-4 text-slate-400 group-hover:text-slate-800 shrink-0 ml-2" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json,application/json"
            className="hidden"
          />

          {/* 3. Export CSV for Excel */}
          <button
            onClick={handleExportCsv}
            className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-slate-800 hover:bg-slate-50/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-emerald-700 group-hover:text-white text-slate-700 flex items-center justify-center transition-colors">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold text-slate-800 block">Exportar a Excel / CSV</span>
                <span className="text-xs text-slate-400">Descarga una tabla detallada con tus gastos para hojas de cálculo.</span>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-400 group-hover:text-slate-800 shrink-0 ml-2" />
          </button>

        </div>

        {/* Footer info */}
        <div className="pt-2 text-center">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
