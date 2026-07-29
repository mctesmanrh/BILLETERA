import express from "express";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./src/server/app.js";
import { hasSupabaseConfiguration } from "./src/server/supabase.js";

const app = createApp();
const parsedPort = Number.parseInt(process.env.PORT ?? "3000", 10);
const port = Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : 3000;

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
