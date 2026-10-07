import { redirect } from "next/navigation";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { rutaInicio, type Rol } from "./rutas";

export type Perfil = { id: string; nombre: string; email: string; rol: Rol };

/** Perfil activo del usuario con sesión, o null. */
export async function obtenerPerfil(): Promise<Perfil | null> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("perfiles")
    .select("id, nombre, email, rol, activo")
    .eq("id", user.id)
    .maybeSingle();
  if (!data || !data.activo) return null;
  return { id: data.id, nombre: data.nombre, email: data.email, rol: data.rol };
}

export async function exigirRol(...roles: Rol[]): Promise<Perfil> {
  const supabase = await crearClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");
  const perfil = await obtenerPerfil();
  if (!perfil) redirect("/sin-acceso");
  if (!roles.includes(perfil.rol)) redirect(rutaInicio(perfil.rol));
  return perfil;
}
