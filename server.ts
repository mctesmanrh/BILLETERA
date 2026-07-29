import { randomUUID } from "node:crypto";
import path from "node:path";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { createServer as createViteServer } from "vite";
import type { Expense } from "./src/types";
import {
  checkDatabaseConnection,
  createExpense,
  emptyTrash,
  loadWalletSnapshot,
  permanentlyDeleteExpense,
  replaceWalletSnapshot,
  restoreExpense,
  softDeleteExpense,
  updateBudget,
} from "./src/server/walletRepository";
import {
  RequestValidationError,
  validateBudget,
  validateExpense,
  validateWalletSnapshot,
} from "./src/server/validation";
import {
  hasSupabaseConfiguration,
  SupabaseConfigurationError,
} from "./src/server/supabase";

const app = express();
const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

app.use(express.json({ limit: "1mb" }));

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

app.get(
  "/api/health",
  asyncRoute(async (_req, res) => {
    if (!hasSupabaseConfiguration()) {
      res.status(503).json({
        status: "configuration_required",
        database: "supabase",
        message:
          "Configura SUPABASE_URL y SUPABASE_SECRET_KEY en .env.local.",
      });
      return;
    }

    await checkDatabaseConnection();
    res.json({ status: "ok", database: "supabase" });
  }),
);

app.get(
  "/api/data",
  asyncRoute(async (_req, res) => {
    res.json(await loadWalletSnapshot());
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
    const expense: Expense = {
      ...input,
      id: `exp-${Date.now()}-${randomUUID().slice(0, 8)}`,
    };

    await createExpense(expense);
    const snapshot = await loadWalletSnapshot();
    res.status(201).json({
      success: true,
      expense,
      expenses: snapshot.expenses,
    });
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
    res.json({ success: true, ...snapshot });
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
      error instanceof SupabaseConfigurationError
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

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    const databaseState = hasSupabaseConfiguration()
      ? "Supabase configurado"
      : "Supabase pendiente de configurar";
    console.log(
      `Tu Billetera disponible en http://localhost:${port} (${databaseState})`,
    );
  });
}

startServer().catch((error) => {
  console.error("No fue posible iniciar Tu Billetera:", error);
  process.exitCode = 1;
});
