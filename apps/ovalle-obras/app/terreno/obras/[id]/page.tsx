import { notFound } from "next/navigation";
import { ListaPartidas } from "@/components/terreno/ListaPartidas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cargarAvanceObra } from "@pyxis/ovalle-core/datos/obra";
import { hoyEnChile } from "@pyxis/ovalle-core/fechas";
import { enCursoHoy, itemsTerreno } from "@pyxis/ovalle-core/terreno/lista";

export default async function PartidasObra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enviado?: string }>;
}) {
  const { id } = await params;
  const { enviado } = await searchParams;
  const hoy = hoyEnChile();
  const datos = await cargarAvanceObra(await crearClienteServidor(), id, hoy);
  if (!datos) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{datos.obra.nombre}</h1>
      {enviado && <p role="status" className="rounded-lg bg-green-100 p-3 text-obra-ok">Reporte enviado ✓</p>}
      <ListaPartidas obraId={id} enCurso={enCursoHoy(datos.raices, hoy)} todas={itemsTerreno(datos.raices)} />
    </div>
  );
}
