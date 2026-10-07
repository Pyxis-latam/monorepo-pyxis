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

  it("conserva la query y el hash de un destino interno", () => {
    expect(destinoSeguro("/terreno/obras/1?tab=fotos#arriba")).toBe("/terreno/obras/1?tab=fotos#arriba");
  });

  it("rechaza destinos que el navegador resolvería a otro origen", () => {
    expect(destinoSeguro("/\\evil.com")).toBe("/");
    expect(destinoSeguro("/\t/evil.com")).toBe("/");
    expect(destinoSeguro("/\n/evil.com")).toBe("/");
    expect(destinoSeguro("/\\\\evil.com")).toBe("/");
    expect(destinoSeguro("\\evil.com")).toBe("/");
  });

  it("rechaza destinos con segmentos de punto que se normalizan a otro origen", () => {
    expect(destinoSeguro("/.//evil.com")).toBe("/");
    expect(destinoSeguro("/..//evil.com")).toBe("/");
    expect(destinoSeguro("/a/..//evil.com")).toBe("/");
    expect(destinoSeguro("/%2e//evil.com")).toBe("/");
    expect(destinoSeguro("/./\\evil.com")).toBe("/");
  });

  it("nunca devuelve algo que el navegador resuelva fuera del origen", () => {
    const variantes = [
      "/%2e%2e//evil.com",
      "/.%2e//evil.com",
      "/a/./..//evil.com",
      "/a/b/../..//evil.com",
      "/.//evil.com?x=1#y",
      "/\r/evil.com",
      "/%5cevil.com",
    ];
    for (const variante of variantes) {
      const salida = destinoSeguro(variante);
      expect(new URL(salida, "http://interno.invalid").origin).toBe("http://interno.invalid");
      expect(salida.startsWith("//")).toBe(false);
    }
  });

  it("deja pasar rutas internas normales con query y puntos en el nombre", () => {
    expect(destinoSeguro("/terreno/obras/1?x=1#y")).toBe("/terreno/obras/1?x=1#y");
    expect(destinoSeguro("/admin/reportes?desde=2026-10-01&hasta=2026-10-31")).toBe(
      "/admin/reportes?desde=2026-10-01&hasta=2026-10-31",
    );
    expect(destinoSeguro("/terreno/obras/1?siguiente=//evil.com")).toBe("/terreno/obras/1?siguiente=//evil.com");
  });

  it("reconoce las rutas que no requieren sesión", () => {
    expect(esRutaPublica("/ingresar")).toBe(true);
    expect(esRutaPublica("/manifest.webmanifest")).toBe(true);
    expect(esRutaPublica("/salir")).toBe(true);
    expect(esRutaPublica("/admin")).toBe(false);
  });

  it("deja públicos los íconos de la app (pestaña, pantalla de inicio e instalación)", () => {
    for (const icono of ["/icon.png", "/apple-icon.png", "/icon-192.png", "/icon-512.png"]) {
      expect(esRutaPublica(icono)).toBe(true);
    }
    expect(esRutaPublica("/icon.svg")).toBe(false);
  });
});
