import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  closePostgresPool,
  getPostgresPool,
  getPostgresTargetLabel,
} from "../src/server/postgres.js";

const MIGRATION_NAME_PATTERN = /^\d+_[a-z0-9_]+\.sql$/;

async function migrate() {
  const pool = getPostgresPool();
  const client = await pool.connect();
  const migrationsPath = path.join(process.cwd(), "database", "migrations");

  try {
    await client.query(`
      create schema if not exists billetera;

      create table if not exists billetera.schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `);

    await client.query(`
      do $$
      begin
        if to_regclass('public.schema_migrations') is not null then
          execute $copy$
            insert into billetera.schema_migrations (name, applied_at)
            select name, applied_at
            from public.schema_migrations
            on conflict (name) do nothing
          $copy$;
        end if;
      end
      $$
    `);

    const migrationFiles = (await readdir(migrationsPath))
      .filter((name) => MIGRATION_NAME_PATTERN.test(name))
      .sort();

    const appliedResult = await client.query<{ name: string }>(
      "select name from billetera.schema_migrations",
    );
    const applied = new Set(appliedResult.rows.map((row) => row.name));

    for (const name of migrationFiles) {
      if (applied.has(name)) continue;

      const sql = await readFile(path.join(migrationsPath, name), "utf8");
      await client.query("begin");
      try {
        await client.query("select pg_advisory_xact_lock(hashtext($1))", [
          "tu-billetera-schema-migrations",
        ]);
        await client.query(sql);
        await client.query(
          "insert into billetera.schema_migrations (name) values ($1)",
          [name],
        );
        await client.query("commit");
        console.log(`Migración aplicada: ${name}`);
      } catch (error) {
        await client.query("rollback");
        throw error;
      }
    }

    console.log(`PostgreSQL listo en ${getPostgresTargetLabel()}.`);
  } finally {
    client.release();
    await closePostgresPool();
  }
}

migrate().catch((error) => {
  console.error("No fue posible migrar PostgreSQL:", error);
  process.exitCode = 1;
});
