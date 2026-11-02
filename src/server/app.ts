import { randomUUID } from "node:crypto";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import type { Expense } from "../types.js";
import {
  checkDatabaseConnection,
  createExpense,
  emptyTrash,
  ensureCurrentWalletMonth,
  loadMonthlyReport,
  loadWalletSnapshot,
  permanentlyDeleteExpense,
  replaceWalletSnapshot,
  restoreExpense,
  softDeleteExpense,
  updateBudget,
  updateDisplayName,
} from "./walletRepository.js";
import {
  RequestValidationError,
  validateBudget,
  validateDisplayName,
  validateExpense,
  validateExpenseMonth,
  validateReportMonth,
  validateWalletSnapshot,
} from "./validation.js";
import { PostgresConfigurationError } from "./postgres.js";
import {
  authHandler,
  getAuthConfigurationStatus,
  getAuthenticatedSession,
  requireAuthenticatedUser,
} from "./auth.js";

type AsyncRoute = (
  req: Request,
  res: Response,
  next: NextFunction,
) => Promise<void>;

function asyncRoute(handler: AsyncRoute) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
}

export function createApp() {
  const app = express();

  app.set("trust proxy", true);
  app.use("/api/auth/*", authHandler);
  app.use(express.json({ limit: "1mb" }));

  app.get(
    "/api/session",
    asyncRoute(async (req, res) => {
      res.json(await getAuthenticatedSession(req));
    }),
  );

  app.get(
    "/api/health",
    asyncRoute(async (_req, res) => {
      await checkDatabaseConnection();
      res.json({
        status: "ok",
        database: "postgresql",
        orm: "prisma",
        auth: getAuthConfigurationStatus(),
      });
    }),
  );

  app.use("/api", asyncRoute(requireAuthenticatedUser));

  app.get(
    "/api/data",
    asyncRoute(async (_req, res) => {
      res.json(await loadWalletSnapshot());
    }),
  );

  app.post(
    "/api/settings/name",
    asyncRoute(async (req, res) => {
      const displayName = validateDisplayName(req.body?.displayName);
      await updateDisplayName(displayName);
      res.json({ success: true, displayName });
    }),
  );

  app.post(
    "/api/budget",
    asyncRoute(async (req, res) => {
      const monthlyBudget = validateBudget(req.body?.budget);
      await updateBudget(monthlyBudget);
      res.json({ success: true, monthlyBudget });
    }),
  );

  app.post(
    "/api/expenses",
    asyncRoute(async (req, res) => {
      const input = validateExpense(req.body?.expense, {
        requireId: false,
      }) as Omit<Expense, "id">;
      const activeMonth = await ensureCurrentWalletMonth();
      validateExpenseMonth(input.date, activeMonth);
      const expense: Expense = {
        ...input,
        id: `exp-${Date.now()}-${randomUUID().slice(0, 8)}`,
      };

      await createExpense(expense);
      const snapshot = await loadWalletSnapshot();
      res.status(201).json({
        success: true,
        expense,
        ...snapshot,
      });
    }),
  );

  app.get(
    "/api/reports/:month",
    asyncRoute(async (req, res) => {
      const monthStart = validateReportMonth(req.params.month);
      const report = await loadMonthlyReport(monthStart);
      if (!report) {
        res.status(404).json({ error: "No existe un informe cerrado para ese mes." });
        return;
      }
      res.json(report);
    }),
  );

  app.delete(
    "/api/expenses/:id",
    asyncRoute(async (req, res) => {
      if (!(await softDeleteExpense(req.params.id))) {
        res.status(404).json({ error: "No se encontró el gasto activo." });
        return;
      }

      const snapshot = await loadWalletSnapshot();
      res.json({ success: true, ...snapshot });
    }),
  );

  app.post(
    "/api/expenses/:id/restore",
    asyncRoute(async (req, res) => {
      if (!(await restoreExpense(req.params.id))) {
        res.status(404).json({ error: "No se encontró el gasto en la papelera." });
        return;
      }

      const snapshot = await loadWalletSnapshot();
      res.json({ success: true, ...snapshot });
    }),
  );

  app.delete(
    "/api/expenses/:id/permanent",
    asyncRoute(async (req, res) => {
      if (!(await permanentlyDeleteExpense(req.params.id))) {
        res.status(404).json({ error: "No se encontró el gasto en la papelera." });
        return;
      }

      const snapshot = await loadWalletSnapshot();
      res.json({ success: true, ...snapshot });
    }),
  );

  app.post(
    "/api/expenses/trash/empty",
    asyncRoute(async (_req, res) => {
      await emptyTrash();
      const snapshot = await loadWalletSnapshot();
      res.json({ success: true, ...snapshot });
    }),
  );

  app.post(
    "/api/import",
    asyncRoute(async (req, res) => {
      const snapshot = validateWalletSnapshot(req.body);
      await replaceWalletSnapshot(snapshot);
      res.json({ success: true, ...(await loadWalletSnapshot()) });
    }),
  );

  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Ruta API no encontrada." });
  });

  app.use(
    (
      error: unknown,
      _req: Request,
      res: Response,
      _next: NextFunction,
    ) => {
      console.error(error);

      const statusCode =
        error instanceof RequestValidationError ||
        error instanceof PostgresConfigurationError
          ? error.statusCode
          : typeof error === "object" &&
              error !== null &&
              "statusCode" in error &&
              typeof error.statusCode === "number"
            ? error.statusCode
            : 500;

      const message =
        error instanceof Error
          ? error.message
          : "Ocurrió un error inesperado en el servidor.";

      res.status(statusCode).json({ error: message });
    },
  );

  return app;
}
