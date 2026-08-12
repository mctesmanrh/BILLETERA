import dotenv from "dotenv";
import { Pool, type PoolConfig } from "pg";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const deploymentEnvFile = process.env.BILLETERA_ENV_FILE?.trim();
if (deploymentEnvFile) {
  dotenv.config({ path: deploymentEnvFile, override: true, quiet: true });
}

let pool: Pool | null = null;

export class PostgresConfigurationError extends Error {
  statusCode = 503;

  constructor(message: string) {
    super(message);
    this.name = "PostgresConfigurationError";
  }
}

export function getPoolConfig(): PoolConfig {
  const connectionString = process.env.DATABASE_URL?.trim();
  const port = Number.parseInt(process.env.PGPORT ?? "5432", 10);

  if (!Number.isInteger(port) || port <= 0) {
    throw new PostgresConfigurationError("PGPORT debe ser un puerto válido.");
  }

  const sharedConfig: PoolConfig = {
    application_name: "tu-billetera-server",
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    max: process.env.VERCEL ? 2 : 10,
    statement_timeout: 10_000,
    query_timeout: 12_000,
  };

  if (connectionString) {
    return { ...sharedConfig, connectionString };
  }

  return {
    ...sharedConfig,
    host: process.env.PGHOST?.trim() || "127.0.0.1",
    port,
    database: process.env.PGDATABASE?.trim() || "tu_billetera",
    user: process.env.PGUSER?.trim() || process.env.USER,
    password: process.env.PGPASSWORD,
  };
}

export function getPostgresPool(): Pool {
  if (pool) return pool;

  pool = new Pool(getPoolConfig());
  pool.on("error", (error) => {
    console.error("La conexión PostgreSQL inactiva falló:", error.message);
  });

  return pool;
}

export async function closePostgresPool(): Promise<void> {
  if (!pool) return;
  const activePool = pool;
  pool = null;
  await activePool.end();
}

export function getPostgresTargetLabel(): string {
  if (process.env.DATABASE_URL?.trim()) return "DATABASE_URL";
  return `${process.env.PGHOST?.trim() || "127.0.0.1"}:${process.env.PGPORT?.trim() || "5432"}/${process.env.PGDATABASE?.trim() || "tu_billetera"}`;
}
