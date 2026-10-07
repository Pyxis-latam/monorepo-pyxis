import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";

export type NuevoReporte = {
  id: string;
  obra_id: string;
  partida_id: string;
  autor: string;
  cantidad: number;
  comentario: string | null;
  foto_path: string | null;
};

/** La web sube un `Blob`; la app móvil sube los bytes (`ArrayBuffer`). */
export type FotoReporte = Blob | ArrayBuffer;

export type ClienteReportes = {
  subirFoto(ruta: string, foto: FotoReporte): Promise<{ error: { message: string; statusCode?: string } | null }>;
  insertarReporte(fila: NuevoReporte): Promise<{ error: { code?: string; message: string } | null }>;
};

export function clienteReportesDesde(supabase: SupabaseClient<Database>): ClienteReportes {
  return {
    subirFoto: async (ruta, foto) => {
      const contentType = foto instanceof ArrayBuffer ? "image/jpeg" : foto.type || "image/jpeg";
      // Sin `upsert`: la ruta es inmutable (se sirve con caché de un año), nunca se reemplazan sus bytes.
      const { error } = await supabase.storage.from("fotos").upload(ruta, foto, { contentType });
      return { error: error ? { message: error.message, statusCode: (error as { statusCode?: string }).statusCode } : null };
    },
    insertarReporte: async (fila) => {
      const { error } = await supabase.from("reportes").insert(fila);
      return { error: error ? { code: error.code, message: error.message } : null };
    },
  };
}

const yaExiste = (e: { message: string; statusCode?: string }) => e.statusCode === "409" || /already exists/i.test(e.message);

export async function enviarReporte(
  cliente: ClienteReportes,
  datos: { id: string; obraId: string; partidaId: string; autorId: string; cantidad: number; comentario: string; foto: FotoReporte | null },
  fotoYaSubida: boolean,
): Promise<{ ok: true } | { ok: false; mensaje: string; fotoSubida: boolean }> {
  const ruta = datos.foto ? `${datos.obraId}/${datos.autorId}/${datos.id}.jpg` : null;
  if (datos.foto && !fotoYaSubida) {
    const { error } = await cliente.subirFoto(ruta!, datos.foto);
    // Ya existe: un intento anterior llegó a subirla aunque no vimos la respuesta. Es la misma foto (misma ruta = mismo reporte).
    if (error && !yaExiste(error)) {
      return { ok: false, mensaje: "No se pudo subir la foto. Revisa la conexión y reintenta.", fotoSubida: false };
    }
  }
  const comentario = datos.comentario.trim();
  const { error } = await cliente.insertarReporte({
    id: datos.id,
    obra_id: datos.obraId,
    partida_id: datos.partidaId,
    autor: datos.autorId,
    cantidad: datos.cantidad,
    comentario: comentario === "" ? null : comentario,
    foto_path: ruta,
  });
  // 23505: el mismo reporte ya llegó (doble toque o reintento) → no se duplica.
  if (error && error.code !== "23505") {
    return { ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: !!ruta };
  }
  return { ok: true };
}
