import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

let adminClientInstance: SupabaseClient | null = null;

/**
 * Obtiene el cliente Supabase Admin con service_role.
 * Se inicializa bajo demanda (lazy evaluation en el primer uso) para evitar
 * ejecuciones tempranas o problemas de entorno al importar el módulo.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (!adminClientInstance) {
    adminClientInstance = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );
  }
  return adminClientInstance;
}

/**
 * Proxy retrocompatible que asegura la inicialización lazy si se accede a supabaseAdmin directamente.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseAdmin() as any;
    const value = client[prop];
    return typeof value === "function" ? value.bind(client) : value;
  },
});
