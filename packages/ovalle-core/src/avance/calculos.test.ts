/** @jest-environment node */
import { estadoHoja, porcentajeEsperado } from "./calculos";

describe("porcentajeEsperado", () => {
  it("interpola linealmente entre inicio y fin", () => {
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-11-06")).toBeCloseTo(0.5);
  });
  it("se acota a 0 antes del inicio y a 1 desde el fin", () => {
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-10-20")).toBe(0);
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-11-11")).toBe(1);
    expect(porcentajeEsperado("2026-11-01", "2026-11-11", "2026-12-01")).toBe(1);
  });
  it("una partida de un día está al 100 % ese día", () => {
    expect(porcentajeEsperado("2026-11-05", "2026-11-05", "2026-11-05")).toBe(1);
    expect(porcentajeEsperado("2026-11-05", "2026-11-05", "2026-11-04")).toBe(0);
  });
  it("sin fechas no hay esperado", () => {
    expect(porcentajeEsperado(null, "2026-11-11", "2026-11-06")).toBeNull();
  });
});

describe("estadoHoja", () => {
  it("terminada si llega al 100 %", () => expect(estadoHoja(1, 0.5)).toBe("terminada"));
  it("atrasada si va bajo lo esperado", () => expect(estadoHoja(0.3, 0.5)).toBe("atrasada"));
  it("al día si iguala o supera lo esperado", () => expect(estadoHoja(0.5, 0.5)).toBe("al_dia"));
  it("sin fechas si no hay esperado y no terminó", () => expect(estadoHoja(0.2, null)).toBe("sin_fechas"));
  it("terminada tolera el error de punto flotante justo bajo 100 %", () =>
    expect(estadoHoja(0.9999999999999999, 0.5)).toBe("terminada"));
});
