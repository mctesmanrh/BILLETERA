import express from "express";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./src/server/app.js";
import { getPostgresTargetLabel } from "./src/server/postgres.js";

const app = createApp();
const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;
const host = process.env.HOST?.trim() || "127.0.0.1";

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

  app.listen(port, host, () => {
    console.log(
      `Tu Billetera disponible en http://${host}:${port} (PostgreSQL: ${getPostgresTargetLabel()})`,
    );
  });
}

startServer().catch((error) => {
  console.error("No fue posible iniciar Tu Billetera:", error);
  process.exitCode = 1;
});
