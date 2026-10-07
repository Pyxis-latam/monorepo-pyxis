import { createBrowserClient } from "@supabase/ssr";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@pyxis/riolimari-core/database.types";

export function crearClienteNavegador() {
  return createBrowserClient<Database>(supabaseUrl(), supabaseAnonKey());
}
