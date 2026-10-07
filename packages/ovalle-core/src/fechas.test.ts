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

  it("vacío es null; fechas imposibles son error", () => {
    expect(parseFecha(null)).toEqual({ ok: true, valor: null });
    expect(parseFecha("31-02-2026")).toEqual({ ok: false });
    expect(parseFecha("mañana")).toEqual({ ok: false });
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
