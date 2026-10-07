import { FormularioUsuario } from "@/components/usuarios/FormularioUsuario";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cambiarActivo } from "./acciones";

export default async function Usuarios() {
  const yo = await exigirRol("admin");
  const supabase = await crearClienteServidor();
  const { data: usuarios } = await supabase.from("perfiles").select("id, nombre, email, rol, activo").order("nombre");
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Usuarios</h1>
      <FormularioUsuario />
      <table className="w-full rounded border border-obra-line bg-white text-sm">
        <thead className="bg-obra-bg text-left">
          <tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Rol</th><th className="px-3 py-2">Estado</th><th /></tr>
        </thead>
        <tbody className="divide-y divide-obra-line">
          {(usuarios ?? []).map((u) => (
            <tr key={u.id}>
              <td className="px-3 py-2">{u.nombre}</td>
              <td className="px-3 py-2">{u.email}</td>
              <td className="px-3 py-2">{u.rol === "admin" ? "Admin" : "Terreno"}</td>
              <td className="px-3 py-2">{u.activo ? "Activo" : "Desactivado"}</td>
              <td className="px-3 py-2 text-right">
                {u.id !== yo.id && (
                  <form action={cambiarActivo.bind(null, u.id, !u.activo)}>
                    <button className="underline">{u.activo ? "Desactivar" : "Reactivar"}</button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
