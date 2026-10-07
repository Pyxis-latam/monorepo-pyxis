import Link from "next/link";
import { notFound } from "next/navigation";
import { Feed } from "@/components/dashboard/Feed";
import { Gantt } from "@/components/dashboard/Gantt";
import { Indicadores } from "@/components/dashboard/Indicadores";
import { Pestanas, type Vista } from "@/components/dashboard/Pestanas";
import { RefrescoEnVivo } from "@/components/dashboard/RefrescoEnVivo";
import { TablaAvance } from "@/components/dashboard/TablaAvance";
import { filtrarArbol, type Filtro } from "@pyxis/riolimari-core/avance/filtros";
import { cargarFeed } from "@pyxis/riolimari-core/datos/feed";
import { cargarAvanceObra } from "@pyxis/riolimari-core/datos/obra";
import { hoyEnChile } from "@pyxis/riolimari-core/fechas";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cambiarEstadoObra } from "./acciones";

const VISTAS: Vista[] = ["tabla", "gantt", "feed"];
const FILTROS: Filtro[] = ["todas", "atrasadas", "en_curso", "terminadas"];

export default async function DashboardObra({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ vista?: string; filtro?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const vista: Vista = VISTAS.includes(q.vista as Vista) ? (q.vista as Vista) : "tabla";
  const filtro: Filtro = FILTROS.includes(q.filtro as Filtro) ? (q.filtro as Filtro) : "todas";
  const hoy = hoyEnChile();
  const supabase = await crearClienteServidor();
  const datos = await cargarAvanceObra(supabase, id, hoy);
  if (!datos) notFound();
  const { obra, raices, resumen } = datos;
  const filtradas = filtrarArbol(raices, filtro, hoy);
  const siguienteEstado = obra.estado === "activa" ? "cerrada" : "activa";
  const reportes = vista === "feed" ? await cargarFeed(supabase, { obraId: id }, 50, { firmarFotos: false }) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="mr-auto text-2xl font-bold">{obra.nombre}{obra.estado === "cerrada" && " (cerrada)"}</h1>
        <RefrescoEnVivo obraId={id} />
        <a href={`/admin/obras/${id}/exportar/excel`} className="rounded border border-obra-line bg-white px-3 py-2 text-sm">Exportar Excel</a>
        <a href={`/admin/obras/${id}/exportar/pdf`} className="rounded border border-obra-line bg-white px-3 py-2 text-sm">Exportar PDF</a>
        <Link href={`/admin/obras/${id}/importar`} className="rounded border border-obra-line bg-white px-3 py-2 text-sm">Reimportar Excel</Link>
        <form action={cambiarEstadoObra.bind(null, id, siguienteEstado)}>
          <button className="rounded border border-obra-line bg-white px-3 py-2 text-sm">
            {obra.estado === "activa" ? "Cerrar obra" : "Reabrir obra"}
          </button>
        </form>
      </div>
      <Indicadores resumen={resumen} />
      <Pestanas obraId={id} vista={vista} filtro={filtro} />
      {vista === "tabla" && <TablaAvance raices={filtradas} />}
      {vista === "gantt" &&
        (filtradas.length === 0 ? <p>No hay partidas para este filtro.</p> : <Gantt raices={filtradas} hoy={hoy} />)}
      {vista === "feed" && <Feed reportes={reportes} obraId={id} />}
    </div>
  );
}
