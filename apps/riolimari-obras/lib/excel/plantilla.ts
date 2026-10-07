import ExcelJS from "exceljs";
import { COLUMNAS } from "./columnas";

export async function construirPlantilla(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Presupuesto");
  hoja.columns = COLUMNAS.map((c) => ({ header: c.titulo, key: c.clave, width: c.clave === "descripcion" ? 40 : 16 }));
  hoja.getRow(1).font = { bold: true };
  // Código como texto: así "1.10" no se convierte en 1.1.
  hoja.getColumn("codigo").numFmt = "@";
  hoja.getColumn("fecha_inicio").numFmt = "dd-mm-yyyy";
  hoja.getColumn("fecha_fin").numFmt = "dd-mm-yyyy";
  hoja.getColumn("precio_unitario").numFmt = "#,##0";
  hoja.addRow({ codigo: "1", descripcion: "Obra gruesa" });
  hoja.addRow({
    codigo: "1.1",
    descripcion: "Enfierradura losa P3",
    unidad: "kg",
    cantidad: 4200,
    precio_unitario: 1150,
    fecha_inicio: new Date(Date.UTC(2026, 10, 3)),
    fecha_fin: new Date(Date.UTC(2026, 10, 14)),
  });
  hoja.addRow({
    codigo: "1.2",
    descripcion: "Hormigón losa P3",
    unidad: "m3",
    cantidad: 85,
    precio_unitario: 98000,
    fecha_inicio: new Date(Date.UTC(2026, 10, 15)),
    fecha_fin: new Date(Date.UTC(2026, 10, 18)),
  });
  const hojaAyuda = wb.addWorksheet("Instrucciones");
  [
    "Una fila por partida. El código define la jerarquía: 1 → 1.1 → 1.1.1.",
    "Filas sin Cantidad son capítulos: agrupan y suman a sus subpartidas.",
    "Filas con Cantidad son partidas reportables: necesitan Unidad y Precio unitario.",
    "Fechas en formato dd-mm-aaaa. Montos en pesos chilenos.",
  ].forEach((t) => hojaAyuda.addRow([t]));
  return Buffer.from(await wb.xlsx.writeBuffer());
}
