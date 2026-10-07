import type { Rol } from "@/lib/auth/rutas";

export function validarNuevoUsuario(
  formData: FormData,
): { ok: true; nombre: string; email: string; rol: Rol } | { ok: false; mensaje: string } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rol = String(formData.get("rol") ?? "");
  if (!nombre) return { ok: false, mensaje: "Falta el nombre." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, mensaje: "El email no es válido." };
  if (rol !== "admin" && rol !== "terreno") return { ok: false, mensaje: "Rol inválido." };
  return { ok: true, nombre, email, rol };
}
