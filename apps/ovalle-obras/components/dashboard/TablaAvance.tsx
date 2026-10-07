import { aplanar } from "@pyxis/ovalle-core/avance/arbol";
import { ETIQUETA_ESTADO, type Estado, type NodoAvance } from "@pyxis/ovalle-core/avance/tipos";
import { formatoCantidad, formatoCLP, formatoFecha, formatoPorcentaje } from "@pyxis/ovalle-core/formato";

// ETIQUETA_ESTADO vive en el core; se reexporta para que otras vistas la importen desde aquí.
export { ETIQUETA_ESTADO };

const COLOR_ESTADO: Record<Estado, string> = {
  al_dia: "bg-obra-bg",
  atrasada: "bg-red-100 text-obra-warn",
  terminada: "bg-green-100 text-obra-ok",
  sin_fechas: "bg-obra-bg text-gray-500",
};

export function TablaAvance({ raices }: { raices: NodoAvance[] }) {
  const filas = aplanar(raices);
  if (filas.length === 0) return <p>No hay partidas para este filtro.</p>;
  return (
    <div className="overflow-auto rounded border border-obra-line bg-white">
      <table className="w-full text-sm">
        <thead className="bg-obra-bg text-left">
          <tr>
            {["Código", "Partida", "Presupuestado", "Ejecutado", "Avance", "$ Presupuesto", "$ Ejecutado", "Plazo", "Estado"].map((t) => (
              <th key={t} className="px-3 py-2 font-medium">{t}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-obra-line">
          {filas.map((n) => (
            <tr key={n.id} className={n.esHoja ? "" : "bg-obra-bg/60 font-semibold"}>
              <td className="px-3 py-2 tabular-nums">{n.codigo}</td>
              <td className="px-3 py-2" style={{ paddingLeft: `${0.75 + n.nivel * 1.25}rem` }}>{n.descripcion}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n.esHoja ? `${formatoCantidad(n.cantidad!)} ${n.unidad}` : ""}</td>
              <td className="px-3 py-2 text-right tabular-nums">{n.esHoja ? `${formatoCantidad(n.ejecutado)} ${n.unidad}` : ""}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-20 rounded bg-obra-line">
                    <div className="h-2 rounded bg-obra-accent" style={{ width: `${Math.min(n.porcentaje, 1) * 100}%` }} />
                  </div>
                  <span className="tabular-nums">{formatoPorcentaje(n.porcentaje)}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">{formatoCLP(n.montoPresupuestado)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{formatoCLP(n.montoEjecutado)}</td>
              <td className="px-3 py-2 whitespace-nowrap">{n.esHoja && n.fecha_inicio ? `${formatoFecha(n.fecha_inicio)} → ${formatoFecha(n.fecha_fin)}` : ""}</td>
              <td className="px-3 py-2">
                <span className={`rounded px-2 py-0.5 text-xs ${COLOR_ESTADO[n.estado]}`}>{ETIQUETA_ESTADO[n.estado]}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
