import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";
import type { Database } from "@pyxis/riolimari-core/database.types";

export async function crearClienteServidor() {
  const cookieStore = await cookies();
  return createServerClient<Database>(supabaseUrl(), supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      // El segundo argumento (headers de caché) no se puede aplicar desde un Server Component: lo aplica el proxy.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setAll(cookiesToSet, _headers: Record<string, string>) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy ya refresca la sesión.
        }
      },
    },
  });
}
