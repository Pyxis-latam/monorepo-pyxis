import type { ReporteFeed } from "@pyxis/ovalle-core/datos/feed";
import { formatoCantidad, formatoMomento } from "@pyxis/ovalle-core/formato";
import { BotonAnular } from "./BotonAnular";

/** Ruta estable (misma URL en cada refresco, así el navegador reutiliza su caché) servida por app/fotos. */
const urlFoto = (fotoPath: string) => `/fotos/${fotoPath.split("/").map(encodeURIComponent).join("/")}`;

export function Feed({ reportes, obraId, conAnular = true }: { reportes: ReporteFeed[]; obraId: string; conAnular?: boolean }) {
  if (reportes.length === 0) return <p>Todavía no hay reportes de terreno.</p>;
  return (
    <ul className="space-y-3">
      {reportes.map((r) => (
        <li key={r.id} className={`flex gap-4 rounded border border-obra-line bg-white p-3 ${r.anulado ? "opacity-50" : ""}`}>
          {r.fotoPath && (
            <a href={urlFoto(r.fotoPath)} target="_blank" rel="noreferrer" className="shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element -- foto privada servida con caché propia por app/fotos */}
              <img
                src={urlFoto(r.fotoPath)}
                alt={`Foto del reporte de ${r.autor}`}
                loading="lazy"
                decoding="async"
                className="h-20 w-20 rounded object-cover"
              />
            </a>
          )}
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              {r.autor && <strong>{r.autor}</strong>}
              <span className="text-sm text-gray-600">{formatoMomento(r.creado_en)}</span>
              {r.anulado && <span className="rounded bg-obra-bg px-2 text-xs">Anulado</span>}
            </div>
            <p className={r.anulado ? "line-through" : ""}>
              {`${formatoCantidad(r.cantidad)} ${r.partida.unidad ?? ""} · ${r.partida.codigo} ${r.partida.descripcion}`}
            </p>
            {r.comentario && <p className="text-sm">{r.comentario}</p>}
          </div>
          {conAnular && !r.anulado && <BotonAnular reporteId={r.id} obraId={obraId} />}
        </li>
      ))}
    </ul>
  );
}
