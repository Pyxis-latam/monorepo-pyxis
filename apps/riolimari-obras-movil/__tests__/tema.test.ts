import { colores } from "@/lib/tema";

// Contraste WCAG 2.x entre dos colores #rrggbb.
function luminancia(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(a: string, b: string) {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (claro + 0.05) / (oscuro + 0.05);
}

describe("tema", () => {
  it("usa el azul petróleo de Río Limarí como color primario", () => {
    expect(colores.acento).toBe("#004D69");
  });

  it("el texto blanco de los botones primarios se lee bien sobre el color primario (≥ 4,5:1)", () => {
    expect(contraste(colores.blanco, colores.acento)).toBeGreaterThanOrEqual(4.5);
  });

  it("el color primario también se lee como texto sobre el fondo (botón Salir)", () => {
    expect(contraste(colores.acento, colores.fondo)).toBeGreaterThanOrEqual(4.5);
  });
});
