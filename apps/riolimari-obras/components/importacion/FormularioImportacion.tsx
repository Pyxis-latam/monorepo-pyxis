"use client";

import { useState, useTransition } from "react";
import { confirmarImportacion, previsualizarImportacion, type ResultadoVistaPrevia } from "@/app/admin/obras/acciones";
import { formatoCantidad, formatoCLP, formatoFecha } from "@pyxis/riolimari-core/formato";

export function FormularioImportacion({ obraId }: { obraId?: string }) {
  const [nombre, setNombre] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [resultado, setResultado] = useState<ResultadoVistaPrevia | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  function datos(): FormData {
    const fd = new FormData();
    if (archivo) fd.set("archivo", archivo);
    if (obraId) fd.set("obraId", obraId);
    else fd.set("nombre", nombre);
    return fd;
  }

  function revisar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!archivo) {
      setResultado({ estado: "error", mensaje: "Selecciona un archivo Excel." });
      return;
    }
    iniciar(async () => setResultado(await previsualizarImportacion(datos())));
  }

  function confirmar() {
    setError(null);
    iniciar(async () => {
      const r = await confirmarImportacion(datos());
      setError(r.mensaje);
    });
  }

  const vista = resultado?.estado === "vista_previa" ? resultado : null;
  const bloqueadas = vista?.diferencias?.bloqueadas ?? [];
  const puedeConfirmar = !!vista && vista.errores.length === 0 && bloqueadas.length === 0 && !pendiente;

  return (
    <div className="space-y-6">
      <form onSubmit={revisar} className="flex flex-wrap items-end gap-4">
        {!obraId && (
          <label className="flex flex-col text-sm">
            Nombre de la obra
            <input required value={nombre} onChange={(e) => setNombre(e.target.value)} className="mt-1 w-72 rounded border border-obra-line bg-white px-3 py-2" />
          </label>
        )}
        <label className="flex flex-col text-sm">
          Archivo Excel
          <input
            type="file"
            aria-required="true"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setResultado(null); }}
            className="mt-1"
          />
        </label>
        <button disabled={pendiente} className="rounded bg-obra-fg px-4 py-2 text-white disabled:opacity-60">Revisar archivo</button>
        <a href="/admin/plantilla" className="text-sm underline">Descargar plantilla</a>
      </form>

      {resultado?.estado === "error" && <p role="alert" className="text-obra-warn">{resultado.mensaje}</p>}

      {vista && (
        <section className="space-y-4">
          {vista.diferencias && (
            <p className="font-medium">
              {vista.diferencias.agregadas.length} nuevas · {vista.diferencias.modificadas.length} modificadas · {vista.diferencias.eliminadas.length} eliminadas
            </p>
          )}
          {bloqueadas.length > 0 && (
            <p role="alert" className="text-obra-warn">
              Estas partidas tienen reportes y no se pueden eliminar ni volverse capítulo: {bloqueadas.join(", ")}
            </p>
          )}
          {vista.errores.length > 0 && (
            <ul role="alert" className="list-disc pl-6 text-obra-warn">
              {vista.errores.map((e) => <li key={`${e.fila}-${e.mensaje}`}>Fila {e.fila}: {e.mensaje}</li>)}
            </ul>
          )}
          <div className="max-h-[50vh] overflow-auto rounded border border-obra-line bg-white">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-obra-bg text-left">
                <tr>{["Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Inicio", "Fin"].map((t) => <th key={t} className="px-2 py-1">{t}</th>)}</tr>
              </thead>
              <tbody>
                {vista.partidas.map((p) => (
                  <tr key={p.codigo} className={p.cantidad === null ? "font-semibold" : ""}>
                    <td className="px-2 py-1">{p.codigo}</td>
                    <td className="px-2 py-1" style={{ paddingLeft: `${p.codigo.split(".").length * 0.75}rem` }}>{p.descripcion}</td>
                    <td className="px-2 py-1">{p.unidad ?? ""}</td>
                    <td className="px-2 py-1 text-right">{p.cantidad === null ? "" : formatoCantidad(p.cantidad)}</td>
                    <td className="px-2 py-1 text-right">{p.precio_unitario === null ? "" : formatoCLP(p.precio_unitario)}</td>
                    <td className="px-2 py-1">{p.cantidad === null ? "" : formatoFecha(p.fecha_inicio)}</td>
                    <td className="px-2 py-1">{p.cantidad === null ? "" : formatoFecha(p.fecha_fin)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={confirmar} disabled={!puedeConfirmar} className="rounded bg-obra-accent px-4 py-2 font-semibold text-white enabled:hover:bg-obra-accent-strong enabled:active:bg-obra-accent-strong disabled:opacity-40">
            {obraId ? "Aplicar cambios" : "Crear obra"}
          </button>
        </section>
      )}
      {error && <p role="alert" className="text-obra-warn">{error}</p>}
    </div>
  );
}
