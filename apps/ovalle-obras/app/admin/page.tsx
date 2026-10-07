import Link from "next/link";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { cargarAvanceObra } from "@pyxis/ovalle-core/datos/obra";
import { hoyEnChile } from "@pyxis/ovalle-core/fechas";
import { formatoPorcentaje } from "@pyxis/ovalle-core/formato";

export default async function Obras() {
  const supabase = await crearClienteServidor();
  const { data: obras } = await supabase.from("obras").select("id, nombre, estado").order("creado_en", { ascending: false });
  const hoy = hoyEnChile();
  const avances = await Promise.all((obras ?? []).map((o) => cargarAvanceObra(supabase, o.id, hoy)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Obras</h1>
        <Link href="/admin/obras/nueva" className="rounded bg-obra-accent px-4 py-2 font-semibold text-white">Nueva obra</Link>
      </div>
      {(obras ?? []).length === 0 ? (
        <p>Aún no hay obras. Crea la primera subiendo su Excel de presupuesto.</p>
      ) : (
        <ul className="divide-y divide-obra-line rounded border border-obra-line bg-white">
          {(obras ?? []).map((o, i) => (
            <li key={o.id}>
              <Link href={`/admin/obras/${o.id}`} className="flex items-center gap-4 px-4 py-3 hover:bg-obra-bg">
                <span className="flex-1 font-medium">{o.nombre}</span>
                {o.estado === "cerrada" && <span className="text-xs uppercase">Cerrada</span>}
                <span className="tabular-nums">{formatoPorcentaje(avances[i]?.resumen.porcentajeFisico ?? 0)}</span>
                <span className="text-sm text-obra-warn">{avances[i]?.resumen.atrasadas ? `${avances[i]!.resumen.atrasadas} atrasadas` : ""}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
