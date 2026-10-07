/** @jest-environment node */
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { GET } from "./route";

jest.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: jest.fn() }));

const download = jest.fn();
const bucket = jest.fn(() => ({ download }));

const pedir = (ruta: string[]) => GET(new Request("http://localhost/fotos/x"), { params: Promise.resolve({ ruta }) });

describe("GET /fotos/[...ruta]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(crearClienteServidor).mockResolvedValue({ storage: { from: bucket } } as never);
  });

  it("sirve la foto con la caché privada e inmutable y el tipo de contenido del archivo", async () => {
    download.mockResolvedValue({ data: new Blob(["jpegbytes"], { type: "image/png" }), error: null });
    const res = await pedir(["o1", "u1", "r1.jpg"]);
    expect(bucket).toHaveBeenCalledWith("fotos");
    expect(download).toHaveBeenCalledWith("o1/u1/r1.jpg");
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("private, max-age=31536000, immutable");
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(await res.text()).toBe("jpegbytes");
  });

  it("usa image/jpeg cuando el archivo no declara tipo", async () => {
    download.mockResolvedValue({ data: new Blob(["x"]), error: null });
    const res = await pedir(["o1", "u1", "r1.jpg"]);
    expect(res.headers.get("Content-Type")).toBe("image/jpeg");
  });

  it.each([
    ["con ..", ["o1", "..", "r1.jpg"]],
    ["con .", ["o1", ".", "r1.jpg"]],
    ["con un segmento vacío", ["o1", "", "r1.jpg"]],
    ["con una barra dentro de un segmento", ["o1", "u1/../x", "r1.jpg"]],
    ["con una barra invertida", ["o1", "u1\\..\\x", "r1.jpg"]],
    ["sin segmentos", []],
  ])("responde 404 sin tocar Storage si la ruta viene %s", async (_caso, ruta) => {
    const res = await pedir(ruta);
    expect(res.status).toBe(404);
    expect(crearClienteServidor).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it("responde 404 si la descarga falla (no existe o RLS no deja leerla)", async () => {
    download.mockResolvedValue({ data: null, error: new Error("Object not found") });
    const res = await pedir(["o1", "u1", "r1.jpg"]);
    expect(res.status).toBe(404);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
