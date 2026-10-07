/** @jest-environment node */
import { construirArbol, resumenObra } from "@pyxis/riolimari-core/avance/arbol";
import { renderizarInformePdf } from "./pdf";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "h", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  ],
  new Map([["h", 1050]]),
  "2026-11-06",
);

const informe = () =>
  renderizarInformePdf({
    obra: { id: "o", nombre: "Edificio Ñuñoa", estado: "activa" },
    raices,
    resumen: resumenObra(raices),
    hoy: "2026-11-06",
  });

describe("renderizarInformePdf", () => {
  it("genera un PDF no vacío con las partidas", async () => {
    const buf = await informe();
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("encabeza el informe con el logo de la empresa (591 × 482)", async () => {
    // Los diccionarios de los objetos del PDF no van comprimidos: el logo aparece como una imagen embebida.
    const pdf = (await informe()).toString("latin1");
    expect(pdf).toMatch(/\/Subtype \/Image/);
    expect(pdf).toMatch(/\/Width 591\b/);
    expect(pdf).toMatch(/\/Height 482\b/);
  });
});
