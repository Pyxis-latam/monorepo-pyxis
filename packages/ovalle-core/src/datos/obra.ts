import type { SupabaseClient } from "@supabase/supabase-js";
import { construirArbol, resumenObra } from "../avance/arbol";
import type { NodoAvance, ResumenObra } from "../avance/tipos";
import type { Database } from "../database.types";
import { traerTodo } from "./paginar";

export type ClienteSupabase = SupabaseClient<Database>;
export type Obra = { id: string; nombre: string; estado: "activa" | "cerrada" };

export async function cargarAvanceObra(
  supabase: ClienteSupabase,
  obraId: string,
  hoy: string,
): Promise<{ obra: Obra; raices: NodoAvance[]; resumen: ResumenObra } | null> {
  // partidas y partida_ejecutado pueden pasar de las 1000 filas que PostgREST devuelve por consulta: se paginan.
  const [{ data: obra, error }, partidas, ejecutado] = await Promise.all([
    supabase.from("obras").select("id, nombre, estado").eq("id", obraId).maybeSingle(),
    traerTodo((desde, hasta) =>
      supabase
        .from("partidas")
        .select("id, parent_id, codigo, descripcion, unidad, cantidad, precio_unitario, fecha_inicio, fecha_fin, orden")
        .eq("obra_id", obraId)
        .order("orden")
        .order("id")
        .range(desde, hasta),
    ),
    traerTodo((desde, hasta) =>
      supabase
        .from("partida_ejecutado")
        .select("partida_id, ejecutado")
        .eq("obra_id", obraId)
        .order("partida_id")
        .range(desde, hasta),
    ),
  ]);
  if (error) throw error;
  if (!obra) return null;
  const mapa = new Map(ejecutado.map((e) => [e.partida_id!, Number(e.ejecutado)]));
  const plan = partidas.map((p) => ({
    ...p,
    cantidad: p.cantidad === null ? null : Number(p.cantidad),
    precio_unitario: p.precio_unitario === null ? null : Number(p.precio_unitario),
  }));
  const raices = construirArbol(plan, mapa, hoy);
  return { obra, raices, resumen: resumenObra(raices) };
}
