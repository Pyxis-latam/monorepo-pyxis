/** @jest-environment node */
import { construirArbol, resumenObra } from "@pyxis/ovalle-core/avance/arbol";
import { renderizarInformePdf } from "./pdf";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "h", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  ],
  new Map([["h", 1050]]),
  "2026-11-06",
);

describe("renderizarInformePdf", () => {
  it("genera un PDF no vacío con las partidas", async () => {
    const buf = await renderizarInformePdf({
      obra: { id: "o", nombre: "Edificio Ñuñoa", estado: "activa" },
      raices,
      resumen: resumenObra(raices),
      hoy: "2026-11-06",
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.subarray(0, 4).toString("latin1")).toBe("%PDF");
    expect(buf.length).toBeGreaterThan(1000);
  });
});
