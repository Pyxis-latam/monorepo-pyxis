import type { SupabaseClient } from "@supabase/supabase-js";
import { construirArbol, resumenObra } from "../avance/arbol";
import type { NodoAvance, ResumenObra } from "../avance/tipos";
import type { Database } from "../database.types";

export type ClienteSupabase = SupabaseClient<Database>;
export type Obra = { id: string; nombre: string; estado: "activa" | "cerrada" };

export async function cargarAvanceObra(
  supabase: ClienteSupabase,
  obraId: string,
  hoy: string,
): Promise<{ obra: Obra; raices: NodoAvance[]; resumen: ResumenObra } | null> {
  const [{ data: obra, error: e0 }, { data: partidas, error: e1 }, { data: ejecutado, error: e2 }] = await Promise.all([
    supabase.from("obras").select("id, nombre, estado").eq("id", obraId).maybeSingle(),
    supabase
      .from("partidas")
      .select("id, parent_id, codigo, descripcion, unidad, cantidad, precio_unitario, fecha_inicio, fecha_fin, orden")
      .eq("obra_id", obraId)
      .order("orden"),
    supabase.from("partida_ejecutado").select("partida_id, ejecutado").eq("obra_id", obraId),
  ]);
  if (e0) throw e0;
  if (e1) throw e1;
  if (e2) throw e2;
  if (!obra) return null;
  const mapa = new Map((ejecutado ?? []).map((e) => [e.partida_id!, Number(e.ejecutado)]));
  const plan = (partidas ?? []).map((p) => ({
    ...p,
    cantidad: p.cantidad === null ? null : Number(p.cantidad),
    precio_unitario: p.precio_unitario === null ? null : Number(p.precio_unitario),
  }));
  const raices = construirArbol(plan, mapa, hoy);
  return { obra, raices, resumen: resumenObra(raices) };
}
