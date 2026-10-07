import ExcelJS from "exceljs";
import { COLUMNAS, normalizarEncabezado, type ClaveColumna } from "./columnas";

export type FilaCruda = {
  fila: number;
  codigo: string;
  descripcion: unknown;
  unidad: unknown;
  cantidad: unknown;
  precio_unitario: unknown;
  fecha_inicio: unknown;
  fecha_fin: unknown;
};

function valorCelda(v: ExcelJS.CellValue): unknown {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if ("result" in v) return valorCelda(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
    if ("error" in v) return null;
    return null;
  }
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" ? null : t;
  }
  return v;
}

export async function leerFilas(
  archivo: ArrayBuffer,
): Promise<{ ok: true; filas: FilaCruda[] } | { ok: false; error: string }> {
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(archivo);
  } catch {
    return { ok: false, error: "El archivo no es un Excel válido (.xlsx)." };
  }
  const hoja = wb.worksheets[0];
  if (!hoja) return { ok: false, error: "El Excel no tiene hojas." };

  const indice = new Map<ClaveColumna, number>();
  hoja.getRow(1).eachCell((celda, col) => {
    const nombre = normalizarEncabezado(celda.text);
    const columna = COLUMNAS.find((c) => normalizarEncabezado(c.titulo) === nombre);
    if (columna) indice.set(columna.clave, col);
  });
  const faltantes = COLUMNAS.filter((c) => !indice.has(c.clave)).map((c) => c.titulo);
  if (faltantes.length > 0) {
    return { ok: false, error: `Faltan columnas en la primera fila: ${faltantes.join(", ")}.` };
  }

  const filas: FilaCruda[] = [];
  hoja.eachRow({ includeEmpty: false }, (row, numero) => {
    if (numero === 1) return;
    const celda = (clave: ClaveColumna) => row.getCell(indice.get(clave)!);
    const fila: FilaCruda = {
      fila: numero,
      // El texto visible evita que "1.10" llegue como el número 1.1.
      codigo: celda("codigo").text.trim(),
      descripcion: valorCelda(celda("descripcion").value),
      unidad: valorCelda(celda("unidad").value),
      cantidad: valorCelda(celda("cantidad").value),
      precio_unitario: valorCelda(celda("precio_unitario").value),
      fecha_inicio: valorCelda(celda("fecha_inicio").value),
      fecha_fin: valorCelda(celda("fecha_fin").value),
    };
    const vacia =
      fila.codigo === "" &&
      [fila.descripcion, fila.unidad, fila.cantidad, fila.precio_unitario, fila.fecha_inicio, fila.fecha_fin].every(
        (v) => v === null,
      );
    if (!vacia) filas.push(fila);
  });
  return { ok: true, filas };
}
