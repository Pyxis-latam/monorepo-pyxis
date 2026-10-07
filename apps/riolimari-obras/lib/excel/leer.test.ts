/** @jest-environment node */
import ExcelJS from "exceljs";
import { leerFilas } from "./leer";
import { construirPlantilla } from "./plantilla";
import { validarFilas } from "./validar";

async function libro(filas: unknown[][], formatoCodigo?: string): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const hoja = wb.addWorksheet("Presupuesto");
  filas.forEach((f) => hoja.addRow(f));
  if (formatoCodigo) hoja.getColumn(1).numFmt = formatoCodigo;
  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}

const ENCABEZADOS = ["Código", "Descripción", "Unidad", "Cantidad", "Precio unitario", "Fecha inicio", "Fecha fin"];

describe("leerFilas", () => {
  it("lee la plantilla oficial ida y vuelta", async () => {
    const r = await leerFilas((await construirPlantilla()) as unknown as ArrayBuffer);
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0]).toMatchObject({ fila: 2, codigo: "1", descripcion: "Obra gruesa" });
    expect(r.filas[1]).toMatchObject({ codigo: "1.1", unidad: "kg", cantidad: 4200 });
  });

  it("acepta encabezados en otro orden, mayúsculas y sin tildes", async () => {
    const r = await leerFilas(
      await libro([
        ["DESCRIPCION", "codigo", "unidad", "cantidad", "precio UNITARIO", "fecha inicio", "fecha fin"],
        ["Excavación", "2.1", "m3", 50, 9000, null, null],
      ]),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.filas).toEqual([
      expect.objectContaining({ codigo: "2.1", descripcion: "Excavación", cantidad: 50, precio_unitario: 9000 }),
    ]);
  });

  it("toma el código como texto visible, no como número (1.10 ≠ 1.1)", async () => {
    const r = await leerFilas(await libro([ENCABEZADOS, ["1.10", "Partida diez", "m2", 1, 1, null, null]], "@"));
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0].codigo).toBe("1.10");
    expect(r.filas[0].codigoNumerico).toBe(false);
  });

  it("marca el código guardado como número: 1.1 con formato 0.00 se ve 1.10 pero se lee 1.1", async () => {
    const r = await leerFilas(
      await libro(
        [
          ENCABEZADOS,
          [1.1, "Partida", "m2", 1, 1, null, null],
          [2, "Capítulo entero", null, null, null, null, null],
        ],
        "0.00",
      ),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.filas[0]).toMatchObject({ codigo: "1.1", codigoNumerico: true });
    // Un entero no es ambiguo: 2 sigue siendo "2".
    expect(r.filas[1]).toMatchObject({ codigo: "2", codigoNumerico: false });
    expect(validarFilas(r.filas).errores).toEqual([
      { fila: 2, mensaje: "Código guardado como número; formatee la columna Código como texto." },
    ]);
  });

  it("no convierte en vacío una celda con error ni una fórmula sin resultado guardado", async () => {
    const r = await leerFilas(
      await libro([
        ENCABEZADOS,
        ["4", "Div cero", "m2", { formula: "1/0", result: { error: "#DIV/0!" } }, 1, null, null],
        ["5", "Sin valor", "m2", { formula: "2*3" }, 1, null, null],
        ["6", "Error directo", "m2", { error: "#N/A" }, 1, null, null],
      ]),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.filas.map((f) => f.cantidad)).toEqual(["#DIV/0!", "#SIN_VALOR", "#N/A"]);
    expect(validarFilas(r.filas).errores.map((e) => e.mensaje)).toEqual([
      "Cantidad no es un número.",
      "Cantidad no es un número.",
      "Cantidad no es un número.",
    ]);
  });

  it("resuelve fórmulas y texto enriquecido; salta filas vacías", async () => {
    const r = await leerFilas(
      await libro([
        ENCABEZADOS,
        ["3", { richText: [{ text: "Termi" }, { text: "naciones" }] }, null, null, null, null, null],
        [null, null, null, null, null, null, null],
        ["3.1", "Pintura", "m2", { formula: "10*2", result: 20 }, 3500, null, null],
      ]),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.filas.map((f) => f.fila)).toEqual([2, 4]);
    expect(r.filas[0].descripcion).toBe("Terminaciones");
    expect(r.filas[1].cantidad).toBe(20);
  });

  it("explica qué columnas faltan", async () => {
    const r = await leerFilas(await libro([["Código", "Descripción"], ["1", "x"]]));
    expect(r).toEqual({ ok: false, error: expect.stringContaining("Unidad") });
  });

  it("rechaza archivos que no son Excel", async () => {
    const r = await leerFilas(new TextEncoder().encode("hola").buffer as ArrayBuffer);
    expect(r).toEqual({ ok: false, error: "El archivo no es un Excel válido (.xlsx)." });
  });
});
