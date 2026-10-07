import { prepararFotoMovil } from "@/lib/fotos";

// Cadena de la API vigente: manipulate(uri).resize(...).renderAsync() → ImageRef; ImageRef.saveAsync(opciones).
const mockSaveAsync = jest.fn();
const mockRenderAsync = jest.fn();
const mockResize = jest.fn();
const mockManipulate = jest.fn();

jest.mock("expo-image-manipulator", () => ({
  ImageManipulator: { manipulate: (...args: unknown[]) => mockManipulate(...args) },
  SaveFormat: { JPEG: "jpeg", PNG: "png", WEBP: "webp" },
}));

beforeEach(() => {
  jest.clearAllMocks();
  const contexto = { resize: mockResize, renderAsync: mockRenderAsync };
  mockManipulate.mockReturnValue(contexto);
  mockResize.mockReturnValue(contexto);
  mockRenderAsync.mockResolvedValue({ saveAsync: mockSaveAsync });
  // "AQID" son los bytes 1, 2, 3.
  mockSaveAsync.mockResolvedValue({ uri: "file:///cache/salida.jpg", width: 1600, height: 1200, base64: "AQID" });
});

const bytes = (b: ArrayBuffer) => Array.from(new Uint8Array(b));

it("reduce una foto horizontal de 4032×3024 a 1600 de ancho, JPEG calidad 0.8", async () => {
  const resultado = await prepararFotoMovil("file:///cache/foto.jpg", 4032, 3024);

  expect(mockManipulate).toHaveBeenCalledWith("file:///cache/foto.jpg");
  expect(mockResize).toHaveBeenCalledTimes(1);
  expect(mockResize).toHaveBeenCalledWith({ width: 1600 });
  expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.8, format: "jpeg", base64: true });
  expect(resultado).toBeInstanceOf(ArrayBuffer);
  expect(bytes(resultado)).toEqual([1, 2, 3]);
});

it("reduce una foto vertical de 3024×4032 a 1600 de alto", async () => {
  await prepararFotoMovil("file:///cache/vertical.jpg", 3024, 4032);

  expect(mockResize).toHaveBeenCalledTimes(1);
  expect(mockResize).toHaveBeenCalledWith({ height: 1600 });
});

it("no agranda una foto de 800×600: la recodifica sin redimensionar", async () => {
  const resultado = await prepararFotoMovil("file:///cache/chica.jpg", 800, 600);

  expect(mockResize).not.toHaveBeenCalled();
  expect(mockSaveAsync).toHaveBeenCalledWith({ compress: 0.8, format: "jpeg", base64: true });
  expect(bytes(resultado)).toEqual([1, 2, 3]);
});

it("deja igual una foto cuyo lado mayor ya mide exactamente 1600", async () => {
  await prepararFotoMovil("file:///cache/justa.jpg", 1600, 900);

  expect(mockResize).not.toHaveBeenCalled();
});

it("falla si el módulo nativo no devuelve los bytes", async () => {
  mockSaveAsync.mockResolvedValue({ uri: "file:///cache/salida.jpg", width: 1600, height: 1200 });

  await expect(prepararFotoMovil("file:///cache/foto.jpg", 4032, 3024)).rejects.toThrow();
});
