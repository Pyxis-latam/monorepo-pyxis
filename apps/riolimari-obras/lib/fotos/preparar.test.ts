/** @jest-environment node */
import { dimensionesEscaladas, MAX_FOTO_BYTES, prepararFoto } from "./preparar";

describe("dimensionesEscaladas", () => {
  it("reduce el lado mayor a 1600 manteniendo proporción", () => {
    expect(dimensionesEscaladas(4032, 3024)).toEqual({ ancho: 1600, alto: 1200 });
    expect(dimensionesEscaladas(3024, 4032)).toEqual({ ancho: 1200, alto: 1600 });
  });
  it("no agranda fotos chicas", () => {
    expect(dimensionesEscaladas(800, 600)).toEqual({ ancho: 800, alto: 600 });
  });
});

describe("prepararFoto", () => {
  const archivo = (bytes: number) => new File([new Uint8Array(bytes)], "f.jpg", { type: "image/jpeg" });

  it("usa la versión comprimida", async () => {
    const comprimida = new Blob(["x"]);
    await expect(prepararFoto(archivo(10), async () => comprimida)).resolves.toBe(comprimida);
  });
  it("si no se puede comprimir, sube el original si no es enorme", async () => {
    const f = archivo(1000);
    await expect(prepararFoto(f, async () => { throw new Error("HEIC"); })).resolves.toBe(f);
  });
  it("si no se puede comprimir y es enorme, explica el problema", async () => {
    await expect(prepararFoto(archivo(MAX_FOTO_BYTES + 1), async () => { throw new Error("x"); })).rejects.toThrow(
      "La foto es muy pesada y no se pudo reducir. Prueba con otra.",
    );
  });
});
