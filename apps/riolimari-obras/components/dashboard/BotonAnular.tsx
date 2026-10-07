"use client";

import { useState, useTransition } from "react";
import { anularReporte } from "@/app/admin/obras/[id]/acciones";

export function BotonAnular({ reporteId, obraId }: { reporteId: string; obraId: string }) {
  const [pendiente, iniciar] = useTransition();
  const [fallo, setFallo] = useState(false);
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        disabled={pendiente}
        onClick={() => {
          if (confirm("¿Anular este reporte? Su cantidad deja de contar en el avance.")) {
            setFallo(false);
            iniciar(async () => {
              try {
                await anularReporte(reporteId, obraId);
              } catch {
                // Sin esto el error llega al límite de error de Next y se pierde todo el dashboard
                // (p. ej. otro admin ya lo anuló). El mensaje real no llega al cliente en producción.
                setFallo(true);
              }
            });
          }
        }}
        className="text-sm text-obra-warn underline disabled:opacity-50"
      >
        Anular
      </button>
      {fallo && (
        <p role="alert" className="max-w-48 text-right text-xs text-obra-warn">
          No se pudo anular. Puede que ya estuviera anulado: recarga la página.
        </p>
      )}
    </div>
  );
}
