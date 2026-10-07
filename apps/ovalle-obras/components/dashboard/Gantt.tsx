import { aplanar } from "@pyxis/ovalle-core/avance/arbol";
import type { NodoAvance } from "@pyxis/ovalle-core/avance/tipos";
import { formatoPorcentaje } from "@pyxis/ovalle-core/formato";
import { meses, posicionBarra, posicionDia, rangoDe } from "@/lib/gantt/escala";

const pct = (f: number) => `${f * 100}%`;

export function Gantt({ raices, hoy }: { raices: NodoAvance[]; hoy: string }) {
  const rango = rangoDe(raices);
  if (!rango) return <p>Las partidas no tienen fechas: no hay Gantt que mostrar.</p>;
  const filas = aplanar(raices).filter((n) => !n.esHoja || (n.fecha_inicio && n.fecha_fin));
  const xHoy = posicionDia(hoy, rango);

  return (
    <div className="overflow-x-auto rounded border border-obra-line bg-white">
      <div className="min-w-[900px]">
        <div className="flex border-b border-obra-line text-xs text-gray-600">
          <div className="w-80 shrink-0 px-3 py-2">Partida</div>
          <div className="relative h-8 flex-1">
            {meses(rango).map((m) => (
              <span key={m.etiqueta} className="absolute top-2 border-l border-obra-line pl-1" style={{ left: pct(m.izquierda) }}>{m.etiqueta}</span>
            ))}
          </div>
        </div>
        {filas.map((n) => {
          const barra = n.esHoja ? posicionBarra(n.fecha_inicio!, n.fecha_fin!, rango) : null;
          const color = n.estado === "atrasada" ? "bg-obra-warn" : n.estado === "terminada" ? "bg-obra-ok" : "bg-obra-accent";
          return (
            <div key={n.id} className="flex border-b border-obra-line/60 text-sm">
              <div className={`w-80 shrink-0 truncate px-3 py-1.5 ${n.esHoja ? "" : "font-semibold"}`} style={{ paddingLeft: `${0.75 + n.nivel}rem` }}>
                {n.codigo} {n.descripcion}
              </div>
              <div className="relative flex-1">
                {barra && (
                  <div className="absolute top-1.5 h-4 rounded bg-obra-line" style={{ left: pct(barra.izquierda), width: pct(barra.ancho) }}>
                    <div aria-label={`Avance ${formatoPorcentaje(n.porcentaje)}`} className={`h-4 rounded ${color}`} style={{ width: pct(Math.min(n.porcentaje, 1)) }} />
                  </div>
                )}
                {xHoy !== null && <div aria-hidden className="absolute inset-y-0 w-px bg-obra-warn/70" style={{ left: pct(xHoy) }} />}
              </div>
            </div>
          );
        })}
        {xHoy !== null && <p aria-label="Hoy" className="px-3 py-1 text-xs text-obra-warn">Línea roja: hoy</p>}
      </div>
    </div>
  );
}
