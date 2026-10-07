import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";
import type { Database } from "@pyxis/riolimari-core/database.types";

// Expo reemplaza `process.env.EXPO_PUBLIC_*` al empaquetar (deben leerse con punto, no con corchetes).
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_ANON_KEY. En desarrollo: npm run env:local -w @pyxis/riolimari-obras-movil",
  );
}

export const supabase: SupabaseClient<Database> = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// En el teléfono no hay pestañas visibles: la sesión se renueva solo mientras la app está en primer plano.
AppState.addEventListener("change", (estado) => {
  if (estado === "active") {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
