"use server";

import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { validarNuevoUsuario } from "@/lib/usuarios/validar";

export type EstadoFormulario = { mensaje: string; ok: boolean } | null;

export async function crearUsuario(_prev: EstadoFormulario, formData: FormData): Promise<EstadoFormulario> {
  await exigirRol("admin");
  const v = validarNuevoUsuario(formData);
  if (!v.ok) return { ok: false, mensaje: v.mensaje };
  const { error } = await crearClienteAdmin().auth.admin.createUser({
    email: v.email,
    email_confirm: true,
    // El trigger toma el nombre de user_metadata y el rol de app_metadata, que solo escribe el
    // service role. Un `rol` en user_metadata se ignora y crearía en silencio un usuario de terreno.
    user_metadata: { nombre: v.nombre },
    app_metadata: { rol: v.rol },
  });
  if (error) {
    const yaExiste = /already|registered|exists/i.test(error.message);
    return { ok: false, mensaje: yaExiste ? "Ya existe un usuario con ese email." : "No se pudo crear el usuario." };
  }
  revalidatePath("/admin/usuarios");
  // Crear el usuario no envía ningún email: el código de ingreso lo pide la persona al entrar.
  return { ok: true, mensaje: `${v.nombre} ya tiene acceso. Avísale que entre a la app con ${v.email} y pida su código de ingreso.` };
}

export async function cambiarActivo(usuarioId: string, activo: boolean): Promise<void> {
  const perfil = await exigirRol("admin");
  if (perfil.id === usuarioId && !activo) throw new Error("No puedes desactivarte a ti mismo.");
  const admin = crearClienteAdmin();
  const { data, error } = await admin.from("perfiles").update({ activo }).eq("id", usuarioId).select("id");
  if (error) throw error;
  // Sin esto, un id inexistente "se desactivaría" sin tocar nada y sin avisar.
  if (!data || data.length === 0) throw new Error("El usuario no existe.");
  // El baneo corta la renovación de sesión; RLS ya bloquea los datos al instante.
  const { error: errorAuth } = await admin.auth.admin.updateUserById(usuarioId, {
    ban_duration: activo ? "none" : "876000h",
  });
  // Si falla, el perfil ya cambió pero la sesión sigue renovándose: que no pase inadvertido.
  if (errorAuth) throw errorAuth;
  revalidatePath("/admin/usuarios");
}
