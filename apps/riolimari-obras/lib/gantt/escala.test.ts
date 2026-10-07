/** @jest-environment node */
import { construirArbol } from "@pyxis/riolimari-core/avance/arbol";
import { meses, posicionBarra, posicionDia, rangoDe } from "./escala";

const hoja = (id: string, inicio: string | null, fin: string | null) => ({
  id, parent_id: null, codigo: id, descripcion: id, unidad: "m2", cantidad: 1, precio_unitario: 1,
  fecha_inicio: inicio, fecha_fin: fin, orden: 0,
});

describe("escala del Gantt", () => {
  const nodos = construirArbol([hoja("a", "2026-11-01", "2026-11-10"), hoja("b", "2026-11-21", "2026-11-30"), hoja("c", null, null)], new Map(), "2026-11-05");
  const rango = rangoDe(nodos)!;

  it("cubre desde el primer inicio hasta el último fin, días inclusivos", () => {
    expect(rango).toEqual({ desde: "2026-11-01", hasta: "2026-11-30", dias: 30 });
  });

  it("ubica barras como fracción del rango", () => {
    expect(posicionBarra("2026-11-01", "2026-11-10", rango)).toEqual({ izquierda: 0, ancho: 10 / 30 });
    expect(posicionBarra("2026-11-21", "2026-11-30", rango)).toEqual({ izquierda: 20 / 30, ancho: 10 / 30 });
  });

  it("ubica el día de hoy o null si está fuera", () => {
    expect(posicionDia("2026-11-16", rango)).toBeCloseTo(15.5 / 30);
    expect(posicionDia("2027-01-01", rango)).toBeNull();
  });

  it("sin fechas no hay rango", () => {
    expect(rangoDe(construirArbol([hoja("c", null, null)], new Map(), "2026-11-05"))).toBeNull();
  });

  it("marca el inicio de cada mes", () => {
    const r = { desde: "2026-11-20", hasta: "2026-12-09", dias: 20 };
    expect(meses(r)).toEqual([
      { etiqueta: "nov 2026", izquierda: 0 },
      { etiqueta: "dic 2026", izquierda: 11 / 20 },
    ]);
  });
});
