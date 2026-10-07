// Lee app.json y las imágenes del disco: corre en Node (tsconfig solo incluye los tipos de jest).
/// <reference types="node" />
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const raiz = path.join(__dirname, "..");
const { expo } = JSON.parse(readFileSync(path.join(raiz, "app.json"), "utf8"));
const PRIMARIO = "#004D69";

// Ancho y alto de un PNG, leídos del encabezado IHDR.
function tamanoPng(ruta: string) {
  const png = readFileSync(path.join(raiz, ruta));
  expect(png.subarray(1, 4).toString("latin1")).toBe("PNG");
  return { ancho: png.readUInt32BE(16), alto: png.readUInt32BE(20) };
}

const pluginSplash = () => {
  const plugin = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-splash-screen");
  return plugin?.[1];
};

describe("app.json", () => {
  it("usa el nombre de Río Limarí", () => {
    // El slug lo fija el proyecto de Expo (@pyxis-latam/rio-limari).
    expect(expo).toMatchObject({ name: "Río Limarí Obras", slug: "rio-limari", scheme: "riolimariobras" });
    const picker = expo.plugins.find((p: unknown) => Array.isArray(p) && p[0] === "expo-image-picker")[1];
    expect(picker.cameraPermission).toMatch(/^Río Limarí Obras /);
    expect(picker.photosPermission).toMatch(/^Río Limarí Obras /);
  });

  it("tiene un ícono de 1024 px", () => {
    expect(expo.icon).toBe("./assets/icon.png");
    expect(tamanoPng(expo.icon)).toEqual({ ancho: 1024, alto: 1024 });
  });

  it("arma el ícono adaptativo de Android con el logo sobre el azul de la marca", () => {
    expect(expo.android.adaptiveIcon).toEqual({
      foregroundImage: "./assets/adaptive-icon.png",
      monochromeImage: "./assets/adaptive-icon.png",
      backgroundColor: PRIMARIO,
    });
    expect(tamanoPng(expo.android.adaptiveIcon.foregroundImage)).toEqual({ ancho: 1024, alto: 1024 });
  });

  it("muestra el logo sobre el azul de la marca al abrir", () => {
    expect(pluginSplash()).toMatchObject({ image: "./assets/splash-icon.png", backgroundColor: PRIMARIO });
    expect(existsSync(path.join(raiz, pluginSplash().image))).toBe(true);
  });

  it("declara un favicon", () => {
    expect(expo.web.favicon).toBe("./assets/favicon.png");
    expect(existsSync(path.join(raiz, expo.web.favicon))).toBe(true);
  });

  it("está enlazada al proyecto de Expo y tiene identificadores de tienda", () => {
    expect(expo.owner).toBe("pyxis-latam");
    expect(expo.extra.eas.projectId).toBe("6b84fba0-6334-4cbb-9254-88e2f8f50636");
    expect(expo.android.package).toBe("cl.empresasriolimari.obras");
    expect(expo.ios.bundleIdentifier).toBe("cl.empresasriolimari.obras");
  });

  it("no deja imágenes de la plantilla sin usar en assets/", () => {
    const usadas = new Set(
      [expo.icon, expo.android.adaptiveIcon.foregroundImage, pluginSplash()?.image, expo.web?.favicon].map((r) =>
        path.basename(r ?? ""),
      ),
    );
    const archivos = readdirSync(path.join(raiz, "assets"), { withFileTypes: true }).filter((e) => e.isFile());
    expect(archivos.map((e) => e.name).filter((nombre) => !usadas.has(nombre))).toEqual([]);
  });
});
