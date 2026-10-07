import { supabase } from "@/lib/supabase";

/** Las URL se firman por una hora y se reutilizan mientras les queden más de 5 minutos. */
const DURACION_S = 3600;
const MARGEN_MS = 5 * 60 * 1000;

type Firma = { url: string; expiraEn: number };

// A nivel de módulo: sobrevive a los enfoques de la pestaña y a las recargas de la lista. Cada firma
// trae un token nuevo, y para el caché de imágenes eso es otra foto que se vuelve a descargar entera.
const firmas = new Map<string, Firma>();

/**
 * URL firmada de cada ruta del bucket `fotos`. Solo pide a Storage las que no tiene o que están por
 * vencer; si la firma falla, esas rutas quedan sin URL (la foto no se muestra) y se piden en la próxima carga.
 */
export async function urlsDeFotos(rutas: string[], ahora: number = Date.now()): Promise<Map<string, string>> {
  const porFirmar = [...new Set(rutas)].filter((ruta) => {
    const firma = firmas.get(ruta);
    return !firma || firma.expiraEn - ahora <= MARGEN_MS;
  });
  if (porFirmar.length > 0) {
    const { data } = await supabase.storage.from("fotos").createSignedUrls(porFirmar, DURACION_S);
    for (const firmada of data ?? []) {
      // Se cuenta desde antes de pedirla: nunca se cree más vigente de lo que es.
      if (firmada.path && firmada.signedUrl) firmas.set(firmada.path, { url: firmada.signedUrl, expiraEn: ahora + DURACION_S * 1000 });
    }
  }
  const urls = new Map<string, string>();
  for (const ruta of rutas) {
    const firma = firmas.get(ruta);
    if (firma && firma.expiraEn > ahora) urls.set(ruta, firma.url);
  }
  return urls;
}

/** Olvida las URL guardadas (lo usan las pruebas para partir de cero). */
export function olvidarUrlsDeFotos(): void {
  firmas.clear();
}
