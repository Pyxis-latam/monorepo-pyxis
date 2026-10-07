"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepararFoto } from "@/lib/fotos/preparar";
import { nuevoIdReporte } from "@/lib/reportes/id";
import { crearClienteNavegador } from "@/lib/supabase/navegador";
import { formatoCantidad, formatoPorcentaje } from "@pyxis/ovalle-core/formato";
import { avanceConReporte, parseCantidadIngresada } from "@pyxis/ovalle-core/reportes/cantidad";
import { clienteReportesDesde, enviarReporte } from "@pyxis/ovalle-core/reportes/enviar";

type Partida = { id: string; codigo: string; descripcion: string; unidad: string; cantidad: number; ejecutado: number };

const NOTA_FIJO = "Este reporte ya se intentó enviar. Reintenta tal cual; si necesitas corregirlo, revisa Mis reportes después.";

export function FormularioReporte({ obraId, autorId, partida }: { obraId: string; autorId: string; partida: Partida }) {
  const router = useRouter();
  // Un id por reporte: los reintentos reutilizan el mismo y la BD no duplica.
  const [id, setId] = useState(nuevoIdReporte);
  const fotoSubida = useRef(false);
  // Tras un insert intentado el reporte pudo llegar a la BD (solo se perdió la respuesta): desde ahí el id, la foto y los
  // valores quedan fijos. Un reintento con otros valores daría 23505 ("enviado") y la BD conservaría los primeros.
  const [insertIntentado, setInsertIntentado] = useState(false);
  const [modo, setModo] = useState<"cantidad" | "porcentaje">("cantidad");
  const [texto, setTexto] = useState("");
  const [comentario, setComentario] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const lectura = texto.trim() ? parseCantidadIngresada(texto, modo, partida.cantidad) : null;
  const seExcede = lectura?.ok && partida.ejecutado + lectura.cantidad > partida.cantidad;

  function elegirFoto(archivo: File | null) {
    if (insertIntentado) return;
    // Sin insert intentado no hay reporte en la BD: la foto puede cambiar. Cada foto sube a <obra>/<autor>/<id>.jpg,
    // una ruta inmutable que no se sobrescribe, así que otra foto va con un id nuevo (si no, la subida daría 409
    // y el reporte quedaría con los bytes de la foto anterior).
    fotoSubida.current = false;
    setId(nuevoIdReporte());
    setFoto(archivo);
  }

  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    const r = parseCantidadIngresada(texto, modo, partida.cantidad);
    if (!r.ok) {
      setError(r.mensaje);
      return;
    }
    setEnviando(true);
    setError(null);
    let envioIniciado = false;
    try {
      const blob = foto ? await prepararFoto(foto) : null;
      envioIniciado = true;
      const resultado = await enviarReporte(
        clienteReportesDesde(crearClienteNavegador()),
        { id, obraId, partidaId: partida.id, autorId, cantidad: r.cantidad, comentario, foto: blob },
        fotoSubida.current,
      );
      if (resultado.ok) {
        router.push(`/terreno/obras/${obraId}?enviado=1`);
        router.refresh();
        return;
      }
      fotoSubida.current = resultado.fotoSubida;
      if (resultado.insertIntentado) setInsertIntentado(true);
      setError(resultado.mensaje);
      setFallo(true);
    } catch (err) {
      // Si `enviarReporte` lanzó no sabemos hasta dónde llegó: el insert pudo salir, así que el reporte queda fijo.
      // (Si falló preparar la foto aún no se envió nada y todo se puede cambiar.)
      if (envioIniciado) setInsertIntentado(true);
      setError(err instanceof Error ? err.message : "Algo falló. Reintenta.");
      setFallo(true);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5">
      <fieldset disabled={enviando} className="min-w-0 space-y-5">
        <div>
          <p className="text-sm text-gray-600">{partida.codigo}</p>
          <h1 className="text-xl font-bold">{partida.descripcion}</h1>
          <p className="text-sm">
            Llevas {formatoCantidad(partida.ejecutado)} de {formatoCantidad(partida.cantidad)} {partida.unidad} ({formatoPorcentaje(avanceConReporte(partida))})
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex gap-2">
            <button type="button" disabled={insertIntentado} onClick={() => setModo("cantidad")} className={`flex-1 rounded-lg py-2 disabled:opacity-60 ${modo === "cantidad" ? "bg-obra-fg text-white" : "bg-white"}`}>{partida.unidad}</button>
            <button type="button" disabled={insertIntentado} onClick={() => setModo("porcentaje")} className={`flex-1 rounded-lg py-2 disabled:opacity-60 ${modo === "porcentaje" ? "bg-obra-fg text-white" : "bg-white"}`}>%</button>
          </div>
          <label className="block text-sm font-medium" htmlFor="cantidad">
            {/* Los reportes se suman: lo que se ingresa es el avance de este reporte, no el total acumulado. */}
            {modo === "cantidad" ? `Avance de este reporte (${partida.unidad})` : "Avance de este reporte (%)"}
          </label>
          <input
            id="cantidad"
            inputMode="decimal"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            disabled={insertIntentado}
            aria-describedby={insertIntentado ? "reporte-fijo" : undefined}
            className="w-full rounded-lg border border-obra-line bg-white px-3 py-3 text-2xl disabled:opacity-60"
          />
          {modo === "porcentaje" && lectura?.ok && <p className="text-sm">= {formatoCantidad(lectura.cantidad)} {partida.unidad}</p>}
          {lectura?.ok && <p className="text-sm">Con este reporte quedaría en {formatoPorcentaje(avanceConReporte(partida, lectura.cantidad))}</p>}
          {seExcede && <p className="text-sm text-obra-warn">Con este reporte se supera lo presupuestado. Puedes enviarlo igual.</p>}
        </div>

        <div className="space-y-2">
          <label className="block space-y-2">
            <span className="text-sm font-medium">Foto (opcional)</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              disabled={insertIntentado}
              aria-describedby={insertIntentado ? "reporte-fijo" : undefined}
              onChange={(e) => elegirFoto(e.target.files?.[0] ?? null)}
              className="block w-full disabled:opacity-60"
            />
          </label>
        </div>

        <label className="block space-y-2" htmlFor="comentario">
          <span className="text-sm font-medium">Comentario (opcional)</span>
          <textarea
            id="comentario"
            maxLength={1000}
            rows={3}
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            disabled={insertIntentado}
            aria-describedby={insertIntentado ? "reporte-fijo" : undefined}
            className="w-full rounded-lg border border-obra-line bg-white px-3 py-2 disabled:opacity-60"
          />
        </label>
      </fieldset>

      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-obra-warn">{error}</p>}
      {insertIntentado && (
        <p id="reporte-fijo" className="text-sm text-gray-600">
          {NOTA_FIJO}
        </p>
      )}

      <button disabled={enviando} className="w-full rounded-lg bg-obra-accent py-4 text-lg font-semibold text-white disabled:opacity-60">
        {enviando ? "Enviando…" : fallo ? "Reintentar" : "Enviar reporte"}
      </button>
    </form>
  );
}
