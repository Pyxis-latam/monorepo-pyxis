import { notFound } from "next/navigation";
import { exigirRol } from "@/lib/auth/sesion";
import { cargarAvanceObra } from "@pyxis/ovalle-core/datos/obra";
import { renderizarInformePdf } from "@/lib/exportar/pdf";
import { hoyEnChile } from "@pyxis/ovalle-core/fechas";
import { slug } from "@pyxis/ovalle-core/formato";
import { crearClienteServidor } from "@/lib/supabase/servidor";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await exigirRol("admin");
  const { id } = await params;
  const hoy = hoyEnChile();
  const datos = await cargarAvanceObra(await crearClienteServidor(), id, hoy);
  if (!datos) notFound();
  const archivo = await renderizarInformePdf({ ...datos, hoy });
  return new Response(new Uint8Array(archivo), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="avance-${slug(datos.obra.nombre)}-${hoy}.pdf"`,
    },
  });
}
