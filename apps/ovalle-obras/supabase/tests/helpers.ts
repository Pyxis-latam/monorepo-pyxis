import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@pyxis/ovalle-core/database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const servicio = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const opciones = { auth: { persistSession: false, autoRefreshToken: false } };

export type Cliente = SupabaseClient<Database>;

/** Cliente con service role: salta RLS. Solo para preparar datos. */
export const adminServicio: Cliente = createClient<Database>(url, servicio, opciones);

export async function crearUsuario(rol: "admin" | "terreno", nombre: string = rol) {
  const email = `${rol}-${crypto.randomUUID()}@test.local`;
  const password = "clave-de-prueba-123";
  const { data, error } = await adminServicio.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // El rol va en app_metadata (solo escribible con service role); el trigger
    // crear_perfil ignora el rol que venga en user_metadata.
    user_metadata: { nombre },
    app_metadata: { rol },
  });
  if (error) throw error;
  const cliente = createClient<Database>(url, anon, opciones);
  const { error: errorIngreso } = await cliente.auth.signInWithPassword({ email, password });
  if (errorIngreso) throw errorIngreso;
  return { id: data.user.id, email, cliente };
}

export async function crearObraConPartidas(estado: "activa" | "cerrada" = "activa") {
  const { data: obra, error } = await adminServicio
    .from("obras")
    .insert({ nombre: `Obra test ${crypto.randomUUID()}`, estado })
    .select("id")
    .single();
  if (error) throw error;
  const { data: capitulo, error: e1 } = await adminServicio
    .from("partidas")
    .insert({ obra_id: obra.id, codigo: "1", descripcion: "Obra gruesa", orden: 0 })
    .select("id")
    .single();
  if (e1) throw e1;
  const { data: hoja, error: e2 } = await adminServicio
    .from("partidas")
    .insert({
      obra_id: obra.id,
      parent_id: capitulo.id,
      codigo: "1.1",
      descripcion: "Enfierradura losa P3",
      unidad: "kg",
      cantidad: 100,
      precio_unitario: 1000,
      fecha_inicio: "2026-11-01",
      fecha_fin: "2026-11-30",
      orden: 1,
    })
    .select("id")
    .single();
  if (e2) throw e2;
  return { obraId: obra.id, capituloId: capitulo.id, hojaId: hoja.id };
}
