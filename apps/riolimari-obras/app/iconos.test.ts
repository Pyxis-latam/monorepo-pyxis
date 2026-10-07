/** @jest-environment node */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

// Ancho y alto de un PNG, leídos del encabezado IHDR.
function tamanoPng(ruta: string) {
  const png = readFileSync(path.join(__dirname, "..", ruta));
  expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
}

// Los genera scripts/generar-iconos.mjs a partir de public/marca/logo-blanco.png.
describe("íconos de la web", () => {
  it.each([
    ["app/icon.png", 512],
    ["app/apple-icon.png", 180],
    ["public/icon-192.png", 192],
    ["public/icon-512.png", 512],
  ])("%s es un PNG cuadrado de %i px", (ruta, lado) => {
    expect(tamanoPng(ruta)).toEqual({ ancho: lado, alto: lado });
  });

  it("no queda el ícono SVG de la plantilla anterior", () => {
    expect(existsSync(path.join(__dirname, "icon.svg"))).toBe(false);
  });
});
