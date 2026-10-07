import Link from "next/link";
import type { Filtro } from "@pyxis/riolimari-core/avance/filtros";

export type Vista = "tabla" | "gantt" | "feed";

const VISTAS: { valor: Vista; texto: string }[] = [
  { valor: "tabla", texto: "Tabla" },
  { valor: "gantt", texto: "Gantt" },
  { valor: "feed", texto: "Reportes" },
];
const FILTROS: { valor: Filtro; texto: string }[] = [
  { valor: "todas", texto: "Todas" },
  { valor: "atrasadas", texto: "Atrasadas" },
  { valor: "en_curso", texto: "En curso" },
  { valor: "terminadas", texto: "Terminadas" },
];

export function Pestanas({ obraId, vista, filtro }: { obraId: string; vista: Vista; filtro: Filtro }) {
  const href = (v: Vista, f: Filtro) => `/admin/obras/${obraId}?vista=${v}&filtro=${f}`;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-obra-line">
      <nav className="flex gap-1">
        {VISTAS.map((v) => (
          <Link key={v.valor} href={href(v.valor, filtro)} className={`px-4 py-2 ${vista === v.valor ? "border-b-2 border-obra-accent font-semibold" : ""}`}>
            {v.texto}
          </Link>
        ))}
      </nav>
      {vista !== "feed" && (
        <nav className="flex gap-2 text-sm">
          {FILTROS.map((f) => (
            <Link key={f.valor} href={href(vista, f.valor)} className={`rounded px-3 py-1 ${filtro === f.valor ? "bg-obra-fg text-white" : "bg-white"}`}>
              {f.texto}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
