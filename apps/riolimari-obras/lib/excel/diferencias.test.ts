/** @jest-environment node */
import { calcularDiferencias, type PartidaExistente } from "./diferencias";
import type { PartidaImportada } from "./validar";

const base = { unidad: "m2", cantidad: 10, precio_unitario: 100, fecha_inicio: null, fecha_fin: null };
const existente = (codigo: string, tieneReportes = false, extra: Partial<PartidaExistente> = {}): PartidaExistente => ({
  codigo, descripcion: `P ${codigo}`, ...base, tieneReportes, ...extra,
});
const nueva = (codigo: string, extra: Partial<PartidaImportada> = {}): PartidaImportada => ({
  codigo, codigo_padre: null, descripcion: `P ${codigo}`, ...base, orden: 0, ...extra,
});

describe("calcularDiferencias", () => {
  it("separa agregadas, modificadas y eliminadas", () => {
    const d = calcularDiferencias(
      [existente("1"), existente("2"), existente("3")],
      [nueva("1"), nueva("2", { cantidad: 20 }), nueva("4")],
    );
    expect(d).toEqual({ agregadas: ["4"], modificadas: ["2"], eliminadas: ["3"], bloqueadas: [] });
  });

  it("bloquea eliminar partidas con reportes", () => {
    const d = calcularDiferencias([existente("1", true)], []);
    expect(d.bloqueadas).toEqual(["1"]);
  });

  it("bloquea convertir en capítulo una partida con reportes", () => {
    const d = calcularDiferencias(
      [existente("1", true)],
      [nueva("1", { cantidad: null, unidad: null, precio_unitario: null })],
    );
    expect(d.bloqueadas).toEqual(["1"]);
  });
});
