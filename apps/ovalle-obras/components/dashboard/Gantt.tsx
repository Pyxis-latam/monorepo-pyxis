import { aplanar } from "@pyxis/ovalle-core/avance/arbol";
import { ETIQUETA_ESTADO, type Estado, type NodoAvance } from "@pyxis/ovalle-core/avance/tipos";
import { formatoFecha, formatoPorcentaje } from "@pyxis/ovalle-core/formato";
import { meses, posicionBarra, posicionDia, rangoDe } from "@/lib/gantt/escala";

const pct = (f: number) => `${f * 100}%`;

const colorBarra = (estado: Estado) =>
  estado === "atrasada" ? "bg-obra-warn" : estado === "terminada" ? "bg-obra-ok" : "bg-obra-accent";

const ESTADOS_LEYENDA: Estado[] = ["al_dia", "atrasada", "terminada"];

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
          const avance = formatoPorcentaje(n.porcentaje);
          return (
            <div key={n.id} className="flex border-b border-obra-line/60 text-sm">
              <div className={`w-80 shrink-0 truncate px-3 py-1.5 ${n.esHoja ? "" : "font-semibold"}`} style={{ paddingLeft: `${0.75 + n.nivel}rem` }}>
                {n.codigo} {n.descripcion}
              </div>
              <div className="relative flex-1">
                {barra && (
                  <div
                    title={`${n.codigo} ${n.descripcion} · ${formatoFecha(n.fecha_inicio)} → ${formatoFecha(n.fecha_fin)} · ${ETIQUETA_ESTADO[n.estado]}`}
                    className="absolute top-1.5 h-4 rounded bg-obra-line"
                    style={{ left: pct(barra.izquierda), width: pct(barra.ancho) }}
                  >
                    <div
                      role="progressbar"
                      aria-label={`Avance ${n.codigo}: ${avance}`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(Math.min(n.porcentaje, 1) * 100)}
                      aria-valuetext={`${avance} · ${ETIQUETA_ESTADO[n.estado]}`}
                      className={`h-4 rounded ${colorBarra(n.estado)}`}
                      style={{ width: pct(Math.min(n.porcentaje, 1)) }}
                    />
                  </div>
                )}
                {xHoy !== null && <div aria-hidden className="absolute inset-y-0 w-px bg-obra-fg" style={{ left: pct(xHoy) }} />}
              </div>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 px-3 py-2 text-xs text-gray-600">
          <ul aria-label="Leyenda de estados" className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {ESTADOS_LEYENDA.map((estado) => (
              <li key={estado} className="flex items-center gap-1.5">
                <span aria-hidden className={`inline-block h-3 w-3 rounded ${colorBarra(estado)}`} />
                {ETIQUETA_ESTADO[estado]}
              </li>
            ))}
          </ul>
          {xHoy !== null && (
            <p id="leyenda-hoy" className="flex items-center gap-1.5">
              <span aria-hidden className="inline-block h-3 w-px bg-obra-fg" />
              Línea negra: hoy
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
