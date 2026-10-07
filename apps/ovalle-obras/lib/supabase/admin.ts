import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@pyxis/ovalle-core/database.types";

/** Salta RLS. Usar solo después de verificar que quien llama es admin. */
export function crearClienteAdmin() {
  return createClient<Database>(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
