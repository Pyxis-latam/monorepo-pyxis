export type Rol = "admin" | "terreno";

const PUBLICAS = ["/ingresar", "/manifest.webmanifest", "/icon.svg"];

export function rutaInicio(rol: Rol | null): string {
  if (rol === "admin") return "/admin";
  if (rol === "terreno") return "/terreno";
  return "/sin-acceso";
}

export function destinoSeguro(siguiente: string | null): string {
  if (!siguiente || !siguiente.startsWith("/") || siguiente.startsWith("//")) return "/";
  return siguiente;
}

export function esRutaPublica(ruta: string): boolean {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`));
}
