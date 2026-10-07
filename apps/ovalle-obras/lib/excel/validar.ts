import { parseFecha } from "@pyxis/ovalle-core/fechas";
import { parseNumeroCL } from "@pyxis/ovalle-core/numeros";
import type { FilaCruda } from "./leer";

export type PartidaImportada = {
  codigo: string;
  codigo_padre: string | null;
  descripcion: string;
  unidad: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  orden: number;
};

export type ErrorFila = { fila: number; mensaje: string };

const CODIGO = /^\d+(\.\d+)*$/;

function texto(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
}

function padreDe(codigo: string): string | null {
  const i = codigo.lastIndexOf(".");
  return i === -1 ? null : codigo.slice(0, i);
}

export function validarFilas(filas: FilaCruda[]): { partidas: PartidaImportada[]; errores: ErrorFila[] } {
  if (filas.length === 0) return { partidas: [], errores: [{ fila: 1, mensaje: "El archivo no tiene partidas." }] };

  const errores: ErrorFila[] = [];
  const partidas: (PartidaImportada & { fila: number })[] = [];
  const filaPorCodigo = new Map<string, number>();

  filas.forEach((f, i) => {
    const error = (mensaje: string) => errores.push({ fila: f.fila, mensaje });
    const codigo = f.codigo.trim();
    if (!CODIGO.test(codigo)) return error("Código inválido: use números separados por puntos (ej. 1.2.3).");
    const previa = filaPorCodigo.get(codigo);
    if (previa !== undefined) return error(`Código ${codigo} repetido (ya está en la fila ${previa}).`);
    filaPorCodigo.set(codigo, f.fila);

    const descripcion = texto(f.descripcion);
    if (!descripcion) return error("Falta la descripción.");

    const cantidad = parseNumeroCL(f.cantidad);
    if (!cantidad.ok) return error("Cantidad no es un número.");
    const esHoja = cantidad.valor !== null;

    let unidad: string | null = null;
    let precio: number | null = null;
    let inicio: string | null = null;
    let fin: string | null = null;

    if (esHoja) {
      if (cantidad.valor! <= 0) return error("Cantidad debe ser mayor que 0.");
      unidad = texto(f.unidad);
      if (!unidad) return error("Una partida con cantidad necesita unidad.");
      const p = parseNumeroCL(f.precio_unitario);
      if (!p.ok) return error("Precio unitario no es un número.");
      if (p.valor === null) return error("Una partida con cantidad necesita precio unitario.");
      if (p.valor < 0) return error("Precio unitario no puede ser negativo.");
      precio = p.valor;
      const fi = parseFecha(f.fecha_inicio);
      if (!fi.ok) return error("Fecha inicio no es una fecha válida (dd-mm-aaaa).");
      const ff = parseFecha(f.fecha_fin);
      if (!ff.ok) return error("Fecha fin no es una fecha válida (dd-mm-aaaa).");
      inicio = fi.valor;
      fin = ff.valor;
      if (inicio && fin && fin < inicio) return error("Fecha fin es anterior a fecha inicio.");
    }

    partidas.push({
      fila: f.fila,
      codigo,
      codigo_padre: padreDe(codigo),
      descripcion,
      unidad,
      cantidad: cantidad.valor,
      precio_unitario: precio,
      fecha_inicio: inicio,
      fecha_fin: fin,
      orden: i,
    });
  });

  const porCodigo = new Map(partidas.map((p) => [p.codigo, p]));
  for (const p of partidas) {
    if (p.codigo_padre && !filaPorCodigo.has(p.codigo_padre)) {
      errores.push({ fila: p.fila, mensaje: `La partida ${p.codigo} no tiene capítulo padre ${p.codigo_padre} en el archivo.` });
    }
    const padre = p.codigo_padre ? porCodigo.get(p.codigo_padre) : undefined;
    if (padre && padre.cantidad !== null) {
      const mensaje = `La partida ${padre.codigo} tiene cantidad y también subpartidas; deje la cantidad solo en las subpartidas.`;
      if (!errores.some((e) => e.fila === padre.fila && e.mensaje === mensaje)) errores.push({ fila: padre.fila, mensaje });
    }
  }

  errores.sort((a, b) => a.fila - b.fila);
  return {
    partidas: partidas.map((p) => {
      const { fila, ...resto } = p;
      void fila;
      return resto;
    }),
    errores,
  };
}
