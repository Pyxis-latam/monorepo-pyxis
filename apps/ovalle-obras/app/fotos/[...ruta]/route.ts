import { crearClienteServidor } from "@/lib/supabase/servidor";

const NO_ENCONTRADA = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * Sirve una foto del bucket privado `fotos` desde una URL estable (`/fotos/<obra>/<autor>/<reporte>.jpg`).
 * Quién puede leerla lo decide RLS de Storage con la sesión del usuario (sin service role).
 * La ruta de una foto nunca cambia de contenido, así que el navegador la guarda sin revalidar.
 * El proxy no corre para las rutas que terminan en .jpg/.png/.webp: esta ruta no depende de él para autorizar.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ ruta: string[] }> }) {
  const { ruta } = await params;
  // Next entrega los segmentos ya decodificados: se rechaza todo lo que pueda salirse del bucket.
  if (ruta.length === 0 || ruta.some((s) => s === "" || s === "." || s === ".." || /[\\/]/.test(s))) {
    return NO_ENCONTRADA();
  }

  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.storage.from("fotos").download(ruta.join("/"));
  if (error || !data) return NO_ENCONTRADA();

  return new Response(data, {
    headers: {
      "Content-Type": data.type || "image/jpeg",
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
