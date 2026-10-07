import { Feed } from "@/components/dashboard/Feed";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cargarFeed } from "@pyxis/riolimari-core/datos/feed";

export default async function MisReportes() {
  const perfil = await exigirRol("terreno", "admin");
  // Las fotos se sirven desde /fotos/<ruta> (estable y cacheable), no con URLs firmadas.
  const reportes = await cargarFeed(await crearClienteServidor(), { autorId: perfil.id }, 30, { firmarFotos: false });
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">Mis reportes</h1>
      <Feed reportes={reportes.map((r) => ({ ...r, autor: "" }))} obraId="" conAnular={false} />
    </div>
  );
}
