export type Rol = "admin" | "terreno";

const PUBLICAS = ["/ingresar", "/salir", "/manifest.webmanifest", "/icon.svg"];

// Origen ficticio: sirve solo para que el parser de URL resuelva el destino igual que el navegador.
const ORIGEN_INTERNO = "http://interno.invalid";

export function rutaInicio(rol: Rol | null): string {
  if (rol === "admin") return "/admin";
  if (rol === "terreno") return "/terreno";
  return "/sin-acceso";
}

/**
 * Destino interno tras ingresar. Se valida resolviendo la URL como lo hace el navegador:
 * revisar solo el prefijo deja pasar `/\evil.com` o `/<TAB>/evil.com`, que el parser
 * WHATWG convierte en http://evil.com/.
 */
export function destinoSeguro(siguiente: string | null): string {
  if (!siguiente || !siguiente.startsWith("/")) return "/";
  try {
    const url = new URL(siguiente, ORIGEN_INTERNO);
    if (url.origin !== ORIGEN_INTERNO) return "/";
    return url.pathname + url.search + url.hash;
  } catch {
    return "/";
  }
}

export function esRutaPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}
