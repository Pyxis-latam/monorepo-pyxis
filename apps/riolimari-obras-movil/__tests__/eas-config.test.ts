// Lee eas.json del disco: corre en Node (tsconfig solo incluye los tipos de jest).
/// <reference types="node" />
import { readFileSync } from "node:fs";
import path from "node:path";

const eas = JSON.parse(readFileSync(path.join(__dirname, "..", "eas.json"), "utf8"));

describe("eas.json", () => {
  it("lleva la versión de la app en EAS, no en el repo", () => {
    expect(eas.cli.appVersionSource).toBe("remote");
  });

  it("el perfil preview genera un APK para instalar por link", () => {
    expect(eas.build.preview).toMatchObject({
      distribution: "internal",
      environment: "preview",
      android: { buildType: "apk" },
    });
  });

  it("el perfil production sube la versión sola y usa las variables de producción", () => {
    expect(eas.build.production).toMatchObject({ autoIncrement: true, environment: "production" });
  });
});
