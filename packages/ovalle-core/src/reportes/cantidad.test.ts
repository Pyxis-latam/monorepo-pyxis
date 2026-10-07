import { parseCantidadIngresada } from "./cantidad";

describe("parseCantidadIngresada", () => {
  it("acepta coma decimal y separador de miles", () => {
    expect(parseCantidadIngresada("12,5", "cantidad", 100)).toEqual({ ok: true, cantidad: 12.5 });
    expect(parseCantidadIngresada("1.200", "cantidad", 4200)).toEqual({ ok: true, cantidad: 1200 });
  });
  it("convierte % a la unidad de la partida", () => {
    expect(parseCantidadIngresada("40", "porcentaje", 4200)).toEqual({ ok: true, cantidad: 1680 });
    expect(parseCantidadIngresada("12,5 %", "porcentaje", 80)).toEqual({ ok: true, cantidad: 10 });
  });
  it.each(["", "0", "-3", "mucho"])("rechaza %p", (t) => {
    expect(parseCantidadIngresada(t, "cantidad", 100)).toEqual({ ok: false, mensaje: "Ingresa una cantidad mayor que 0." });
  });
});
