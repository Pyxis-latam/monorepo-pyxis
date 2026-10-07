import { redirect } from "next/navigation";
import { obtenerPerfil } from "@/lib/auth/sesion";
import { rutaInicio } from "@/lib/auth/rutas";

export default async function Inicio() {
  const perfil = await obtenerPerfil();
  redirect(rutaInicio(perfil?.rol ?? null));
}
