"use client";

import { useActionState } from "react";
import { crearUsuario, type EstadoFormulario } from "@/app/admin/usuarios/acciones";

export function FormularioUsuario() {
  const [estado, accion, pendiente] = useActionState<EstadoFormulario, FormData>(crearUsuario, null);
  return (
    <form action={accion} className="flex flex-wrap items-end gap-3 rounded border border-obra-line bg-white p-4">
      <label className="flex flex-col text-sm">Nombre<input name="nombre" required className="mt-1 rounded border border-obra-line px-3 py-2" /></label>
      <label className="flex flex-col text-sm">Email<input name="email" type="email" required className="mt-1 rounded border border-obra-line px-3 py-2" /></label>
      <label className="flex flex-col text-sm">
        Rol
        <select name="rol" defaultValue="terreno" className="mt-1 rounded border border-obra-line px-3 py-2">
          <option value="terreno">Terreno</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <button disabled={pendiente} className="rounded bg-obra-accent px-4 py-2 font-semibold text-white disabled:opacity-60">Crear usuario</button>
      {estado && <p role="status" className={`w-full text-sm ${estado.ok ? "text-obra-ok" : "text-obra-warn"}`}>{estado.mensaje}</p>}
    </form>
  );
}
