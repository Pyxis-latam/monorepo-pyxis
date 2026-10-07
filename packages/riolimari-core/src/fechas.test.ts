/** @jest-environment node */
import { diasEntre, hoyEnChile, parseFecha } from "./fechas";

describe("parseFecha", () => {
  it("usa la fecha UTC de los Date de Excel (no se corre un día)", () => {
    expect(parseFecha(new Date(Date.UTC(2026, 10, 3)))).toEqual({ ok: true, valor: "2026-11-03" });
  });

  it("acepta texto dd-mm-aaaa y dd/mm/aaaa", () => {
    expect(parseFecha("03-11-2026")).toEqual({ ok: true, valor: "2026-11-03" });
    expect(parseFecha("3/11/2026")).toEqual({ ok: true, valor: "2026-11-03" });
  });

  it("acepta número serial de Excel", () => {
    expect(parseFecha(46329)).toEqual({ ok: true, valor: "2026-11-03" });
  });

  it("un serial con hora se queda en su día (la fracción es la hora, no se redondea)", () => {
    expect(parseFecha(46329.75)).toEqual({ ok: true, valor: "2026-11-03" });
    expect(parseFecha(46329.5)).toEqual({ ok: true, valor: "2026-11-03" });
    expect(parseFecha(46329.25)).toEqual({ ok: true, valor: "2026-11-03" });
  });

  it("vacío es null; fechas imposibles son error", () => {
    expect(parseFecha(null)).toEqual({ ok: true, valor: null });
    expect(parseFecha("31-02-2026")).toEqual({ ok: false });
    expect(parseFecha("mañana")).toEqual({ ok: false });
  });

  it("rechaza fechas fuera de 1900-2200 sin lanzar excepciones", () => {
    expect(parseFecha(2958466)).toEqual({ ok: false }); // 31-12-9999 en Excel
    expect(parseFecha(1e9)).toEqual({ ok: false });
    expect(parseFecha(new Date(Date.UTC(12026, 0, 1)))).toEqual({ ok: false });
    expect(parseFecha(new Date(Date.UTC(1850, 0, 1)))).toEqual({ ok: false });
    expect(parseFecha("01-01-1850")).toEqual({ ok: false });
    expect(parseFecha("01-01-2201")).toEqual({ ok: false });
  });

  it("rechaza seriales menores que 1 y acepta los extremos del rango", () => {
    expect(parseFecha(0)).toEqual({ ok: false });
    expect(parseFecha(-1)).toEqual({ ok: false });
    expect(parseFecha("01-01-1900")).toEqual({ ok: true, valor: "1900-01-01" });
    expect(parseFecha("31-12-2200")).toEqual({ ok: true, valor: "2200-12-31" });
    expect(parseFecha(new Date(Date.UTC(2200, 11, 31)))).toEqual({ ok: true, valor: "2200-12-31" });
  });
});

describe("hoyEnChile", () => {
  it("usa la zona horaria de Santiago", () => {
    // 2026-11-04 02:00 UTC = 2026-11-03 23:00 en Chile (UTC-3 en verano)
    expect(hoyEnChile(new Date("2026-11-04T02:00:00Z"))).toBe("2026-11-03");
  });
});

describe("diasEntre", () => {
  it("cuenta días calendario", () => {
    expect(diasEntre("2026-11-01", "2026-11-30")).toBe(29);
    expect(diasEntre("2026-11-01", "2026-11-01")).toBe(0);
  });
});
