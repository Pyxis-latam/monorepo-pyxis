/** @jest-environment node */
import ExcelJS from "exceljs";
import { construirArbol, resumenObra } from "@pyxis/riolimari-core/avance/arbol";
import { construirExcelAvance } from "./excel";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "h", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  ],
  new Map([["h", 1050]]),
  "2026-11-06",
);

describe("construirExcelAvance", () => {
  it("escribe resumen y una fila por partida con valores numéricos", async () => {
    const buf = await construirExcelAvance({
      obra: { id: "o", nombre: "Edificio Ñuñoa", estado: "activa" },
      raices,
      resumen: resumenObra(raices),
      hoy: "2026-11-06",
    });
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const hoja = wb.getWorksheet("Avance")!;
    expect(hoja.getCell("A1").value).toBe("Edificio Ñuñoa — avance al 06-11-2026");
    expect(hoja.getCell("B3").value).toBeCloseTo(0.25);
    const encabezado = hoja.getRow(6).values as unknown[];
    expect(encabezado).toContain("Código");
    const hojaFila = hoja.getRow(8);
    expect(hojaFila.getCell(1).value).toBe("1.1");
    expect(hojaFila.getCell(4).value).toBe(4200);
    expect(hojaFila.getCell(5).value).toBe(1050);
    expect(hojaFila.getCell(6).value).toBeCloseTo(0.25);
    expect(hojaFila.getCell(10).value).toBe("Atrasada");
  });
});
