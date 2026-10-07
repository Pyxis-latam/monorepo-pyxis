export const MAX_FOTO_BYTES = 10 * 1024 * 1024;
const LADO_MAXIMO = 1600;

export function dimensionesEscaladas(ancho: number, alto: number, maximo = LADO_MAXIMO) {
  const escala = Math.min(1, maximo / Math.max(ancho, alto));
  return { ancho: Math.round(ancho * escala), alto: Math.round(alto * escala) };
}

/** Redimensiona en el navegador a JPEG (máx. 1600 px, calidad 0.8). */
export async function comprimirEnNavegador(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const { ancho, alto } = dimensionesEscaladas(imagen.width, imagen.height);
  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob falló"))), "image/jpeg", 0.8),
  );
}

export async function prepararFoto(archivo: File, comprimir: (f: File) => Promise<Blob> = comprimirEnNavegador): Promise<Blob> {
  try {
    return await comprimir(archivo);
  } catch {
    if (archivo.size <= MAX_FOTO_BYTES) return archivo;
    throw new Error("La foto es muy pesada y no se pudo reducir. Prueba con otra.");
  }
}
