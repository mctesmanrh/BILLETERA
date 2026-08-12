import { CATEGORIES, formatCurrency, formatMonthYearSpanish } from "./data";
import type { Expense, MonthlyReport } from "./types";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function expenseRows(expenses: Expense[], status: string): string {
  if (expenses.length === 0) {
    return `<tr><td colspan="5" class="empty">No hay movimientos ${status.toLowerCase()}.</td></tr>`;
  }

  return expenses.map((expense) => {
    const category = CATEGORIES[expense.category]?.label ?? expense.category;
    return `
      <tr>
        <td>${escapeHtml(expense.date)}</td>
        <td>${escapeHtml(category)}</td>
        <td>${escapeHtml(expense.description)}</td>
        <td class="amount">${escapeHtml(formatCurrency(expense.amount))}</td>
        <td><span class="status">${escapeHtml(status)}</span></td>
      </tr>`;
  }).join("");
}

export function downloadMonthlyReportDocument(report: MonthlyReport): void {
  const monthLabel = formatMonthYearSpanish(report.monthStart);
  const generatedAt = new Intl.DateTimeFormat("es-CO", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "America/Bogota",
  }).format(new Date());
  const documentHtml = `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Informe Tu Billetera — ${escapeHtml(monthLabel)}</title>
  <style>
    :root { color-scheme: light; font-family: Arial, sans-serif; color: #0f172a; }
    body { margin: 0; background: #f8fafc; }
    main { max-width: 960px; margin: 0 auto; padding: 40px 24px; }
    header { border-bottom: 3px solid #0f172a; padding-bottom: 20px; margin-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; }
    h2 { margin-top: 34px; font-size: 18px; }
    p { color: #64748b; margin: 4px 0; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
    .metric { background: white; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; }
    .metric span { display: block; color: #64748b; font-size: 11px; text-transform: uppercase; }
    .metric strong { display: block; margin-top: 6px; font-size: 22px; }
    table { width: 100%; border-collapse: collapse; background: white; border: 1px solid #e2e8f0; }
    th, td { padding: 11px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 12px; }
    th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .06em; }
    .amount { text-align: right; font-weight: 700; white-space: nowrap; }
    .status { border-radius: 999px; background: #f1f5f9; padding: 4px 8px; font-size: 10px; font-weight: 700; }
    .empty { color: #64748b; text-align: center; padding: 22px; }
    footer { margin-top: 28px; color: #94a3b8; font-size: 11px; }
    @media (max-width: 680px) { .metrics { grid-template-columns: 1fr; } main { padding: 24px 12px; } }
    @media print { body { background: white; } main { max-width: none; padding: 0; } }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>Informe mensual — ${escapeHtml(monthLabel)}</h1>
      <p>Tu Billetera de Angie y Jordan</p>
      <p>Periodo cerrado automáticamente el ${escapeHtml(new Intl.DateTimeFormat("es-CO", {
        dateStyle: "long",
        timeZone: "America/Bogota",
      }).format(new Date(report.archivedAt)))}</p>
    </header>

    <section class="metrics">
      <div class="metric"><span>Presupuesto</span><strong>${escapeHtml(formatCurrency(report.monthlyBudget))}</strong></div>
      <div class="metric"><span>Gastado</span><strong>${escapeHtml(formatCurrency(report.totalSpent))}</strong></div>
      <div class="metric"><span>Disponible</span><strong>${escapeHtml(formatCurrency(report.availableBalance))}</strong></div>
    </section>

    <h2>Movimientos contabilizados (${report.expenseCount})</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th class="amount">Monto</th><th>Estado</th></tr></thead>
      <tbody>${expenseRows(report.expenses, "Contabilizado")}</tbody>
    </table>

    <h2>Movimientos que estaban en papelera (${report.deletedExpenseCount})</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Categoría</th><th>Descripción</th><th class="amount">Monto</th><th>Estado</th></tr></thead>
      <tbody>${expenseRows(report.deletedExpenses, "Papelera")}</tbody>
    </table>

    <footer>Documento generado el ${escapeHtml(generatedAt)}. Los movimientos de papelera no se incluyen en el total gastado.</footer>
  </main>
</body>
</html>`;

  const objectUrl = URL.createObjectURL(
    new Blob([documentHtml], { type: "text/html;charset=utf-8" }),
  );
  const downloadAnchor = document.createElement("a");
  downloadAnchor.href = objectUrl;
  downloadAnchor.download = `informe_tu_billetera_${report.monthStart.slice(0, 7)}.html`;
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
