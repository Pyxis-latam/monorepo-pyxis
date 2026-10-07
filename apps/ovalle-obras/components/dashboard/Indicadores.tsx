import type { ResumenObra } from "@pyxis/ovalle-core/avance/tipos";
import { formatoCLP, formatoPorcentaje } from "@pyxis/ovalle-core/formato";

export function Indicadores({ resumen }: { resumen: ResumenObra }) {
  const tarjetas = [
    { titulo: "Avance físico", valor: formatoPorcentaje(resumen.porcentajeFisico), detalle: "ponderado por monto" },
    { titulo: "Ejecutado", valor: formatoCLP(resumen.montoEjecutado), detalle: `de ${formatoCLP(resumen.montoPresupuestado)}` },
    { titulo: "Partidas atrasadas", valor: String(resumen.atrasadas), detalle: `de ${resumen.hojas}` },
  ];
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {tarjetas.map((t) => (
        <div key={t.titulo} className="rounded border border-obra-line bg-white p-4">
          <p className="text-sm text-gray-600">{t.titulo}</p>
          <p className="text-3xl font-bold tabular-nums">{t.valor}</p>
          <p className="text-sm text-gray-600">{t.detalle}</p>
        </div>
      ))}
    </div>
  );
}
