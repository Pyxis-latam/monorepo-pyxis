/** @jest-environment node */
import { construirArbol } from "./arbol";
import { filtrarArbol } from "./filtros";
import type { PartidaPlan } from "./tipos";

const base = { descripcion: "x", unidad: "m2", precio_unitario: 1, orden: 0 };
const PARTIDAS: PartidaPlan[] = [
  { ...base, id: "c", codigo: "1", parent_id: null, unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null },
  { ...base, id: "a", codigo: "1.1", parent_id: "c", cantidad: 10, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  { ...base, id: "b", codigo: "1.2", parent_id: "c", cantidad: 10, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 2 },
  { ...base, id: "d", codigo: "1.3", parent_id: "c", cantidad: 10, fecha_inicio: "2026-12-01", fecha_fin: "2026-12-11", orden: 3 },
];
const raices = construirArbol(PARTIDAS, new Map([["a", 1], ["b", 10]]), "2026-11-06");

describe("filtrarArbol", () => {
  it("deja los capítulos que contienen hojas que cumplen", () => {
    expect(filtrarArbol(raices, "atrasadas", "2026-11-06")[0].hijos.map((n) => n.codigo)).toEqual(["1.1"]);
    expect(filtrarArbol(raices, "terminadas", "2026-11-06")[0].hijos.map((n) => n.codigo)).toEqual(["1.2"]);
  });
  it("en curso = hoy dentro del rango y no terminada", () => {
    expect(filtrarArbol(raices, "en_curso", "2026-11-06")[0].hijos.map((n) => n.codigo)).toEqual(["1.1"]);
  });
  it("todas devuelve el árbol completo", () => {
    expect(filtrarArbol(raices, "todas", "2026-11-06")).toBe(raices);
  });
});
