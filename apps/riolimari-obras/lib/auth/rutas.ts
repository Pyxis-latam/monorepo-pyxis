export type Rol = "admin" | "terreno";

// Los íconos (app/icon.png, app/apple-icon.png y los del manifest en public/) se piden sin sesión.
const PUBLICAS = [
  "/ingresar",
  "/salir",
  "/manifest.webmanifest",
  "/icon.png",
  "/apple-icon.png",
  "/icon-192.png",
  "/icon-512.png",
];

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
  // Una ruta interna legítima no lleva "\" ni caracteres de control: el navegador los trata
  // como "/" o los descarta, y así se camuflan destinos como `/\evil.com` o `/<TAB>/evil.com`.
  if (/[\\\u0000-\u001f\u007f]/.test(siguiente)) return "/";
  try {
    const url = new URL(siguiente, ORIGEN_INTERNO);
    if (url.origin !== ORIGEN_INTERNO) return "/";
    const salida = url.pathname + url.search + url.hash;
    // Los segmentos de punto se normalizan: `/.//evil.com` sale como `//evil.com`, que el
    // navegador resuelve contra otro origen. Se valida también lo que se devuelve.
    if (salida.startsWith("//") || salida.startsWith("/\\")) return "/";
    if (new URL(salida, ORIGEN_INTERNO).origin !== ORIGEN_INTERNO) return "/";
    return salida;
  } catch {
    return "/";
  }
}

export function esRutaPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}
