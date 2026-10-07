import ExcelJS from "exceljs";
import { aplanar } from "@pyxis/riolimari-core/avance/arbol";
import { ETIQUETA_ESTADO, type NodoAvance, type ResumenObra } from "@pyxis/riolimari-core/avance/tipos";
import type { Obra } from "@pyxis/riolimari-core/datos/obra";
import { formatoFecha } from "@pyxis/riolimari-core/formato";

export type DatosInforme = { obra: Obra; raices: NodoAvance[]; resumen: ResumenObra; hoy: string };

export async function construirExcelAvance({ obra, raices, resumen, hoy }: DatosInforme): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Avance");
  hoja.getCell("A1").value = `${obra.nombre} — avance al ${formatoFecha(hoy)}`;
  hoja.getCell("A1").font = { bold: true, size: 14 };
  hoja.addRow([]);
  hoja.getRow(3).values = ["Avance físico", resumen.porcentajeFisico];
  hoja.getCell("B3").numFmt = "0.0%";
  hoja.getRow(4).values = ["$ ejecutado / $ presupuestado", resumen.montoEjecutado, resumen.montoPresupuestado];
  hoja.getCell("B4").numFmt = "#,##0";
  hoja.getCell("C4").numFmt = "#,##0";
  hoja.getRow(5).values = ["Partidas atrasadas", resumen.atrasadas];

  hoja.getRow(6).values = ["Código", "Partida", "Unidad", "Presupuestado", "Ejecutado", "Avance", "$ Presupuesto", "$ Ejecutado", "Plazo", "Estado"];
  hoja.getRow(6).font = { bold: true };

  aplanar(raices).forEach((n, i) => {
    const fila = hoja.getRow(7 + i);
    fila.values = [
      n.codigo,
      `${"  ".repeat(n.nivel)}${n.descripcion}`,
      n.unidad ?? "",
      n.esHoja ? n.cantidad : null,
      n.esHoja ? n.ejecutado : null,
      n.porcentaje,
      n.montoPresupuestado,
      n.montoEjecutado,
      n.esHoja && n.fecha_inicio ? `${formatoFecha(n.fecha_inicio)} → ${formatoFecha(n.fecha_fin)}` : "",
      ETIQUETA_ESTADO[n.estado],
    ];
    if (!n.esHoja) fila.font = { bold: true };
    fila.getCell(6).numFmt = "0.0%";
    fila.getCell(7).numFmt = "#,##0";
    fila.getCell(8).numFmt = "#,##0";
  });
  hoja.columns.forEach((c, i) => { c.width = i === 1 ? 45 : 16; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
