"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function cambiarEstadoObra(obraId: string, estado: "activa" | "cerrada"): Promise<void> {
  await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { error } = await supabase.from("obras").update({ estado }).eq("id", obraId);
  if (error) throw error;
  revalidatePath(`/admin/obras/${obraId}`);
  revalidatePath("/admin");
}

export async function anularReporte(reporteId: string, obraId: string): Promise<void> {
  const perfil = await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("reportes")
    .update({ anulado: true, anulado_por: perfil.id, anulado_en: new Date().toISOString() })
    .eq("id", reporteId);
  if (error) throw error;
  revalidatePath(`/admin/obras/${obraId}`);
}
