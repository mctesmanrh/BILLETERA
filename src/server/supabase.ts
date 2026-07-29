import dotenv from "dotenv";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

dotenv.config({ path: ".env.local", quiet: true });
dotenv.config({ quiet: true });

let client: SupabaseClient<Database> | null = null;
const MODERN_SECRET_KEY_PREFIX = "sb_secret_";

function getServerKey(): string | undefined {
  const modernSecretKey = process.env.SUPABASE_SECRET_KEY?.trim();
  if (modernSecretKey?.startsWith(MODERN_SECRET_KEY_PREFIX)) {
    return modernSecretKey;
  }

  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || undefined;
}

export class SupabaseConfigurationError extends Error {
  statusCode = 503;

  constructor() {
    super(
      "Falta configurar SUPABASE_URL y una SUPABASE_SECRET_KEY válida en " +
        ".env.local. La clave debe comenzar por sb_secret_ y permanecer " +
        "únicamente en el servidor; una sb_publishable_ no tiene permisos " +
        "para esta API.",
    );
    this.name = "SupabaseConfigurationError";
  }
}

export function hasSupabaseConfiguration(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && getServerKey());
}

export function getSupabaseClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.SUPABASE_URL?.trim();
  const secretKey = getServerKey();

  if (!url || !secretKey) {
    throw new SupabaseConfigurationError();
  }

  client = createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "X-Client-Info": "tu-billetera-server/1.0",
      },
    },
  });

  return client;
}
