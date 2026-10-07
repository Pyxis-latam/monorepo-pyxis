/** @jest-environment node */
import { destinoSeguro, esRutaPublica, rutaInicio } from "./rutas";

describe("rutas de auth", () => {
  it("lleva a cada rol a su inicio", () => {
    expect(rutaInicio("admin")).toBe("/admin");
    expect(rutaInicio("terreno")).toBe("/terreno");
    expect(rutaInicio(null)).toBe("/sin-acceso");
  });

  it("solo acepta destinos internos tras ingresar", () => {
    expect(destinoSeguro("/terreno/obras/1")).toBe("/terreno/obras/1");
    expect(destinoSeguro("//malo.com")).toBe("/");
    expect(destinoSeguro("https://malo.com")).toBe("/");
    expect(destinoSeguro(null)).toBe("/");
  });

  it("reconoce las rutas que no requieren sesión", () => {
    expect(esRutaPublica("/ingresar")).toBe(true);
    expect(esRutaPublica("/manifest.webmanifest")).toBe(true);
    expect(esRutaPublica("/admin")).toBe(false);
  });
});
