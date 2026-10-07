/** @jest-environment node */
import { parseNumeroCL } from "./numeros";

describe("parseNumeroCL", () => {
  it.each([
    [4200, 4200],
    ["4.200", 4200],
    ["1.150,5", 1150.5],
    ["$ 12.000", 12000],
    ["12,5", 12.5],
    ["0,75", 0.75],
    ["  300 ", 300],
    ["1234.5", 1234.5],
  ])("lee %p como %p", (entrada, esperado) => {
    expect(parseNumeroCL(entrada)).toEqual({ ok: true, valor: esperado });
  });

  it("trata vacío como null", () => {
    expect(parseNumeroCL(null)).toEqual({ ok: true, valor: null });
    expect(parseNumeroCL("  ")).toEqual({ ok: true, valor: null });
  });

  it("rechaza texto que no es número", () => {
    expect(parseNumeroCL("doce")).toEqual({ ok: false });
    expect(parseNumeroCL("1.2.3,4,5")).toEqual({ ok: false });
  });
});
