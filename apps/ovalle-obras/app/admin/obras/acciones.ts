"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { leerFilas } from "@/lib/excel/leer";
import { validarFilas, type ErrorFila, type PartidaImportada } from "@/lib/excel/validar";
import { calcularDiferencias, type Diferencias } from "@/lib/excel/diferencias";

const MAX_BYTES = 4 * 1024 * 1024;

export type ResultadoVistaPrevia =
  | { estado: "vista_previa"; partidas: PartidaImportada[]; errores: ErrorFila[]; diferencias: Diferencias | null }
  | { estado: "error"; mensaje: string };

async function procesar(formData: FormData) {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { error: "Selecciona un archivo Excel." } as const;
  if (archivo.size > MAX_BYTES) return { error: "El archivo pesa más de 4 MB." } as const;
  const lectura = await leerFilas(await archivo.arrayBuffer());
  if (!lectura.ok) return { error: lectura.error } as const;
  return { archivo, ...validarFilas(lectura.filas) } as const;
}

async function diferenciasCon(obraId: string, partidas: PartidaImportada[]): Promise<Diferencias> {
  const supabase = await crearClienteServidor();
  const [{ data: existentes, error }, { data: reportes }] = await Promise.all([
    supabase
      .from("partidas")
      .select("id, codigo, descripcion, unidad, cantidad, precio_unitario, fecha_inicio, fecha_fin")
      .eq("obra_id", obraId),
    supabase.from("reportes").select("partida_id").eq("obra_id", obraId),
  ]);
  if (error) throw error;
  const conReportes = new Set((reportes ?? []).map((r) => r.partida_id));
  return calcularDiferencias(
    (existentes ?? []).map((p) => ({
      codigo: p.codigo,
      descripcion: p.descripcion,
      unidad: p.unidad,
      cantidad: p.cantidad === null ? null : Number(p.cantidad),
      precio_unitario: p.precio_unitario === null ? null : Number(p.precio_unitario),
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      tieneReportes: conReportes.has(p.id),
    })),
    partidas,
  );
}

export async function previsualizarImportacion(formData: FormData): Promise<ResultadoVistaPrevia> {
  await exigirRol("admin");
  const r = await procesar(formData);
  if ("error" in r) return { estado: "error", mensaje: r.error! };
  const obraId = formData.get("obraId");
  const diferencias = typeof obraId === "string" && obraId ? await diferenciasCon(obraId, r.partidas) : null;
  return { estado: "vista_previa", partidas: r.partidas, errores: r.errores, diferencias };
}

export async function confirmarImportacion(formData: FormData): Promise<{ estado: "error"; mensaje: string }> {
  await exigirRol("admin");
  const r = await procesar(formData);
  if ("error" in r) return { estado: "error", mensaje: r.error! };
  if (r.errores.length > 0) return { estado: "error", mensaje: "El archivo tiene errores; corrígelos y vuelve a subirlo." };

  const obraIdForm = formData.get("obraId");
  const obraId = typeof obraIdForm === "string" && obraIdForm ? obraIdForm : null;
  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!obraId && !nombre) return { estado: "error", mensaje: "Ponle un nombre a la obra." };

  const supabase = await crearClienteServidor();
  const ruta = `${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.xlsx`;
  const subida = await supabase.storage.from("importaciones").upload(ruta, r.archivo, {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  if (subida.error) return { estado: "error", mensaje: "No se pudo guardar el archivo. Intenta de nuevo." };

  const { data, error } = await supabase.rpc("aplicar_importacion", {
    // Postgres acepta null en estos dos; los tipos generados los declaran como string no anulable.
    p_obra_id: obraId as unknown as string,
    p_nombre: (obraId ? null : nombre) as unknown as string,
    p_partidas: r.partidas,
    p_archivo_path: ruta,
  });
  if (error || !data) {
    // La importación no se aplicó: no dejar el Excel huérfano en Storage.
    await supabase.storage.from("importaciones").remove([ruta]);
    return { estado: "error", mensaje: error?.message ?? "No se pudo importar." };
  }

  revalidatePath("/admin");
  redirect(`/admin/obras/${data}`);
}
