import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

const deploymentEnvFile = process.env.BILLETERA_ENV_FILE?.trim();
if (deploymentEnvFile) {
  dotenv.config({ path: deploymentEnvFile, override: true, quiet: true });
}

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  `postgresql://${process.env.PGUSER || process.env.USER || "postgres"}@${
    process.env.PGHOST || "127.0.0.1"
  }:${process.env.PGPORT || "5432"}/${process.env.PGDATABASE || "tu_billetera"}`;

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: databaseUrl,
  },
});
