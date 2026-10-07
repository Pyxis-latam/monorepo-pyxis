import { formatoCLP, formatoPorcentaje, formatoFecha, formatoCantidad, slug } from "./formato";

describe("formato", () => {
  it("formatea pesos chilenos sin decimales", () => {
    expect(formatoCLP(4830000)).toBe("$4.830.000");
    expect(formatoCLP(1150.6)).toBe("$1.151");
  });

  it("formatea fracciones como porcentaje con coma y un decimal", () => {
    expect(formatoPorcentaje(0.453)).toBe("45,3%");
    expect(formatoPorcentaje(1.2)).toBe("120,0%");
    expect(formatoPorcentaje(0)).toBe("0,0%");
  });

  it("formatea fechas ISO como dd-mm-aaaa y vacío como guion", () => {
    expect(formatoFecha("2026-11-03")).toBe("03-11-2026");
    expect(formatoFecha(null)).toBe("—");
  });

  it("formatea cantidades con separador de miles chileno", () => {
    expect(formatoCantidad(4200.5)).toBe("4.200,5");
    expect(formatoCantidad(12)).toBe("12");
  });

  it("genera slugs ASCII para nombres de archivo", () => {
    expect(slug("Edificio Ñuñoa — Etapa 2")).toBe("edificio-nunoa-etapa-2");
  });
});
