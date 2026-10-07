import { olvidarUrlsDeFotos, urlsDeFotos } from "@/lib/fotos-firmadas";

const mockFirmar = jest.fn();
const mockBucket = jest.fn();
let mockToken = 0;

jest.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: (bucket: string) => {
        mockBucket(bucket);
        return { createSignedUrls: (...args: unknown[]) => mockFirmar(...args) };
      },
    },
  },
}));

const MINUTO = 60_000;
const T0 = Date.UTC(2026, 10, 5, 14, 0);

/** Cada firma trae un token nuevo, como Storage: para el caché de imágenes es otra URL. */
function firmarBien() {
  mockFirmar.mockImplementation(async (rutas: string[]) => ({
    data: rutas.map((path) => ({ path, signedUrl: `https://firmada/${path}?token=${++mockToken}`, error: null })),
    error: null,
  }));
}

beforeEach(() => {
  jest.clearAllMocks();
  mockToken = 0;
  olvidarUrlsDeFotos();
  firmarBien();
});

it("dos cargas seguidas con la misma foto reutilizan la URL y la firman una sola vez", async () => {
  const primera = await urlsDeFotos(["o1/u1/r1.jpg"], T0);
  const segunda = await urlsDeFotos(["o1/u1/r1.jpg"], T0 + 10 * MINUTO);

  expect(primera.get("o1/u1/r1.jpg")).toBe("https://firmada/o1/u1/r1.jpg?token=1");
  expect(segunda.get("o1/u1/r1.jpg")).toBe("https://firmada/o1/u1/r1.jpg?token=1");
  expect(mockFirmar).toHaveBeenCalledTimes(1);
  expect(mockFirmar).toHaveBeenCalledWith(["o1/u1/r1.jpg"], 3600);
  expect(mockBucket).toHaveBeenCalledWith("fotos");
});

it("reutiliza la URL mientras le queden más de 5 minutos y la vuelve a firmar cuando está por vencer", async () => {
  await urlsDeFotos(["o1/u1/r1.jpg"], T0);

  // Firmada por una hora: a los 54 minutos le quedan 6.
  const aun = await urlsDeFotos(["o1/u1/r1.jpg"], T0 + 54 * MINUTO);
  expect(aun.get("o1/u1/r1.jpg")).toBe("https://firmada/o1/u1/r1.jpg?token=1");
  expect(mockFirmar).toHaveBeenCalledTimes(1);

  // A los 55 minutos le quedan 5: se pide otra antes de que la foto se rompa en pantalla.
  const renovada = await urlsDeFotos(["o1/u1/r1.jpg"], T0 + 55 * MINUTO);
  expect(renovada.get("o1/u1/r1.jpg")).toBe("https://firmada/o1/u1/r1.jpg?token=2");
  expect(mockFirmar).toHaveBeenCalledTimes(2);

  // La renovada vale otra hora desde que se firmó.
  const despues = await urlsDeFotos(["o1/u1/r1.jpg"], T0 + 100 * MINUTO);
  expect(despues.get("o1/u1/r1.jpg")).toBe("https://firmada/o1/u1/r1.jpg?token=2");
  expect(mockFirmar).toHaveBeenCalledTimes(2);
});

it("solo firma las fotos que no tiene, sin repetir rutas", async () => {
  await urlsDeFotos(["a.jpg"], T0);
  const urls = await urlsDeFotos(["a.jpg", "b.jpg", "b.jpg"], T0 + MINUTO);

  expect(mockFirmar).toHaveBeenCalledTimes(2);
  expect(mockFirmar).toHaveBeenLastCalledWith(["b.jpg"], 3600);
  expect(urls.get("a.jpg")).toBe("https://firmada/a.jpg?token=1");
  expect(urls.get("b.jpg")).toBe("https://firmada/b.jpg?token=2");
});

it("sin fotos no llama a Storage", async () => {
  await expect(urlsDeFotos([], T0)).resolves.toEqual(new Map());
  expect(mockFirmar).not.toHaveBeenCalled();
});

it("si la firma falla esas fotos quedan sin URL y se vuelven a pedir en la próxima carga", async () => {
  mockFirmar.mockResolvedValueOnce({ data: null, error: { message: "Network request failed" } });

  const fallida = await urlsDeFotos(["o1/u1/r1.jpg"], T0);
  expect(fallida.has("o1/u1/r1.jpg")).toBe(false);

  const reintento = await urlsDeFotos(["o1/u1/r1.jpg"], T0 + MINUTO);
  expect(reintento.get("o1/u1/r1.jpg")).toBe("https://firmada/o1/u1/r1.jpg?token=1");
  expect(mockFirmar).toHaveBeenCalledTimes(2);
});

it("si no se pudo renovar una URL ya vencida no la entrega", async () => {
  await urlsDeFotos(["o1/u1/r1.jpg"], T0);
  mockFirmar.mockResolvedValueOnce({ data: null, error: { message: "Network request failed" } });

  const urls = await urlsDeFotos(["o1/u1/r1.jpg"], T0 + 61 * MINUTO);
  expect(urls.has("o1/u1/r1.jpg")).toBe(false);
});
