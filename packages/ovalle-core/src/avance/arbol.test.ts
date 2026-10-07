/** @jest-environment node */
import { aplanar, construirArbol, resumenObra } from "./arbol";
import type { PartidaPlan } from "./tipos";

const p = (id: string, codigo: string, parent_id: string | null, extra: Partial<PartidaPlan> = {}): PartidaPlan => ({
  id, codigo, parent_id, descripcion: codigo, unidad: null, cantidad: null, precio_unitario: null,
  fecha_inicio: null, fecha_fin: null, orden: Number(codigo.replace(/\./g, "")), ...extra,
});
const hoja = (cantidad: number, precio: number, inicio = "2026-11-01", fin = "2026-11-11") => ({
  unidad: "m2", cantidad, precio_unitario: precio, fecha_inicio: inicio, fecha_fin: fin,
});

const PARTIDAS = [
  p("c1", "1", null),
  p("h11", "1.1", "c1", hoja(100, 1000)), // $100.000
  p("h12", "1.2", "c1", hoja(10, 30000)), // $300.000
  p("c2", "2", null),
  p("h21", "2.1", "c2", hoja(50, 2000, "2026-12-01", "2026-12-10")), // $100.000
];

describe("construirArbol", () => {
  const ejecutado = new Map([["h11", 50], ["h12", 10], ["h21", 0]]);
  const raices = construirArbol(PARTIDAS, ejecutado, "2026-11-06");

  it("anida por parent_id respetando el orden", () => {
    expect(raices.map((n) => n.codigo)).toEqual(["1", "2"]);
    expect(raices[0].hijos.map((n) => n.codigo)).toEqual(["1.1", "1.2"]);
    expect(raices[0].hijos[0].nivel).toBe(1);
  });

  it("calcula hojas: %, montos y estado", () => {
    const [h11, h12] = raices[0].hijos;
    expect(h11).toMatchObject({ esHoja: true, ejecutado: 50, porcentaje: 0.5, montoPresupuestado: 100000, montoEjecutado: 50000, estado: "al_dia" });
    expect(h12).toMatchObject({ porcentaje: 1, estado: "terminada" });
  });

  it("topa el monto ejecutado en lo presupuestado aunque el % pase de 100", () => {
    const [n] = aplanar(construirArbol([p("h", "1", null, hoja(10, 100))], new Map([["h", 12]]), "2026-11-06"));
    expect(n.porcentaje).toBeCloseTo(1.2);
    expect(n.montoEjecutado).toBe(1000);
  });

  it("los capítulos suman montos y ponderan el % por monto", () => {
    expect(raices[0]).toMatchObject({ esHoja: false, montoPresupuestado: 400000, montoEjecutado: 350000, porcentaje: 0.875 });
  });

  it("un capítulo está atrasado si alguna hoja lo está", () => {
    const r = construirArbol(PARTIDAS, new Map([["h11", 10]]), "2026-11-06");
    expect(r[0].estado).toBe("atrasada");
  });
});

describe("resumenObra", () => {
  it("pondera el avance físico global por monto y cuenta atrasadas", () => {
    const r = construirArbol(PARTIDAS, new Map([["h11", 10], ["h12", 10]]), "2026-11-06");
    expect(resumenObra(r)).toEqual({
      montoPresupuestado: 500000,
      montoEjecutado: 310000,
      porcentajeFisico: 0.62,
      atrasadas: 1,
      hojas: 3,
    });
  });

  it("una obra sin montos tiene 0 % y no divide por cero", () => {
    expect(resumenObra([]).porcentajeFisico).toBe(0);
  });
});
