/** @jest-environment node */
import { construirArbol } from "../avance/arbol";
import { buscarPartidas, enCursoHoy, itemsTerreno } from "./lista";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "a", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 100, precio_unitario: 1, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-10", orden: 1 },
    { id: "b", parent_id: "c", codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3", cantidad: 10, precio_unitario: 1, fecha_inicio: "2026-11-11", fecha_fin: "2026-11-15", orden: 2 },
  ],
  new Map([["a", 30]]),
  "2026-11-05",
);

describe("lista de terreno", () => {
  it("lista solo hojas, con su capítulo", () => {
    expect(itemsTerreno(raices)).toEqual([
      { id: "a", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 100, ejecutado: 30, porcentaje: 0.3, capitulo: "1 Obra gruesa" },
      { id: "b", codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3", cantidad: 10, ejecutado: 0, porcentaje: 0, capitulo: "1 Obra gruesa" },
    ]);
  });

  it("en curso hoy = las que el Gantt dice que se están ejecutando", () => {
    expect(enCursoHoy(raices, "2026-11-05").map((i) => i.codigo)).toEqual(["1.1"]);
  });

  it("busca sin importar tildes ni mayúsculas, también por código", () => {
    const items = itemsTerreno(raices);
    expect(buscarPartidas(items, "hormigon").map((i) => i.codigo)).toEqual(["1.2"]);
    expect(buscarPartidas(items, "1.1").map((i) => i.codigo)).toEqual(["1.1"]);
    expect(buscarPartidas(items, "")).toBe(items);
  });
});
