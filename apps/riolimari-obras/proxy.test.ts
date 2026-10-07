/** @jest-environment node */
import { config } from "./proxy";

// Next compila el matcher como una expresión que debe cubrir la ruta completa.
const coincide = (ruta: string) => new RegExp(`^${config.matcher[0]}$`).test(ruta);

describe("matcher del proxy", () => {
  it("deja fuera los archivos estáticos", () => {
    expect(coincide("/_next/static/chunk.js")).toBe(false);
    expect(coincide("/_next/image")).toBe(false);
    expect(coincide("/favicon.ico")).toBe(false);
    expect(coincide("/icon.svg")).toBe(false);
    expect(coincide("/fotos/obra.jpg")).toBe(false);
  });

  it("protege las rutas de la app, incluso si terminan en las letras de una extensión", () => {
    expect(coincide("/")).toBe(true);
    expect(coincide("/admin")).toBe(true);
    expect(coincide("/admin/obras/xsvg")).toBe(true);
    expect(coincide("/terreno/obras/1/png")).toBe(true);
  });
});
