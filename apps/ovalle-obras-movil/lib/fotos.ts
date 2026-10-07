import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/** Mismo criterio que la web: lado mayor de 1600 px como máximo, JPEG calidad 0.8. */
const LADO_MAXIMO = 1600;
const CALIDAD_JPEG = 0.8;

function base64ABytes(base64: string): ArrayBuffer {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  return bytes.buffer;
}

/**
 * Reduce la foto en el teléfono y devuelve los bytes del JPEG. Nunca la agranda: si el lado mayor ya
 * es de 1600 px o menos solo se recodifica. `ancho`/`alto` son los que informa el selector de imágenes.
 */
export async function prepararFotoMovil(uri: string, ancho: number, alto: number): Promise<ArrayBuffer> {
  const contexto = ImageManipulator.manipulate(uri);
  if (Math.max(ancho, alto) > LADO_MAXIMO) {
    // Con un solo lado, el otro se calcula manteniendo la proporción.
    contexto.resize(ancho >= alto ? { width: LADO_MAXIMO } : { height: LADO_MAXIMO });
  }
  const imagen = await contexto.renderAsync();
  const { base64 } = await imagen.saveAsync({ compress: CALIDAD_JPEG, format: SaveFormat.JPEG, base64: true });
  if (!base64) throw new Error("No se pudo leer la foto procesada.");
  return base64ABytes(base64);
}
