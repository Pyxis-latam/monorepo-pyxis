import { cargarFeed } from "./feed";
import type { ClienteSupabase } from "./obra";

type Fila = {
  id: string;
  cantidad: number | string;
  comentario: string | null;
  foto_path: string | null;
  creado_en: string;
  anulado: boolean;
  partida: { codigo: string; descripcion: string; unidad: string | null } | null;
  autor: { nombre: string } | null;
};

const partida = { codigo: "1.1", descripcion: "Enfierradura", unidad: "kg" };

/** Cliente falso: registra la cadena de la consulta y responde con `filas`; Storage firma `firmadas`. */
function clienteFalso(filas: Fila[], firmadas: { path: string; signedUrl: string }[] = [], error: unknown = null) {
  const llamadas: { metodo: string; args: unknown[] }[] = [];
  const consulta: Record<string, unknown> = {
    then: (ok: (v: unknown) => unknown) => Promise.resolve({ data: error ? null : filas, error }).then(ok),
  };
  for (const metodo of ["select", "order", "limit", "eq"]) {
    consulta[metodo] = (...args: unknown[]) => {
      llamadas.push({ metodo, args });
      return consulta;
    };
  }
  const createSignedUrls = jest.fn().mockResolvedValue({ data: firmadas, error: null });
  const from = jest.fn((tabla: string) => {
    llamadas.push({ metodo: "from", args: [tabla] });
    return consulta;
  });
  const bucket = jest.fn(() => ({ createSignedUrls }));
  const cliente = { from, storage: { from: bucket } } as unknown as ClienteSupabase;
  return { cliente, llamadas, createSignedUrls, bucket };
}

const fila = (extra: Partial<Fila> = {}): Fila => ({
  id: "r1", cantidad: "20.5", comentario: null, foto_path: null, creado_en: "2026-11-05T14:32:00Z", anulado: false,
  partida, autor: { nombre: "Juan Pérez" }, ...extra,
});

describe("cargarFeed", () => {
  it("pide los reportes más nuevos primero, limitados, y filtra por obra", async () => {
    const { cliente, llamadas } = clienteFalso([]);
    await cargarFeed(cliente, { obraId: "o1" });
    expect(llamadas[0]).toEqual({ metodo: "from", args: ["reportes"] });
    expect(llamadas.find((l) => l.metodo === "order")?.args).toEqual(["creado_en", { ascending: false }]);
    expect(llamadas.find((l) => l.metodo === "limit")?.args).toEqual([50]);
    expect(llamadas.filter((l) => l.metodo === "eq").map((l) => l.args)).toEqual([["obra_id", "o1"]]);
  });

  it("filtra por autor (Mis reportes) y respeta el límite pedido", async () => {
    const { cliente, llamadas } = clienteFalso([]);
    await cargarFeed(cliente, { autorId: "u1" }, 10);
    expect(llamadas.find((l) => l.metodo === "limit")?.args).toEqual([10]);
    expect(llamadas.filter((l) => l.metodo === "eq").map((l) => l.args)).toEqual([["autor", "u1"]]);
  });

  it("convierte la cantidad a número, firma las fotos por defecto y deja null las que no tienen", async () => {
    const { cliente, createSignedUrls, bucket } = clienteFalso(
      [fila({ id: "r1", foto_path: "o1/a.jpg" }), fila({ id: "r2", foto_path: null })],
      [{ path: "o1/a.jpg", signedUrl: "https://x/a.jpg?token=1" }],
    );
    const feed = await cargarFeed(cliente, { obraId: "o1" });
    expect(bucket).toHaveBeenCalledWith("fotos");
    expect(createSignedUrls).toHaveBeenCalledWith(["o1/a.jpg"], 3600);
    expect(feed).toEqual([
      { id: "r1", cantidad: 20.5, comentario: null, creado_en: "2026-11-05T14:32:00Z", anulado: false, fotoUrl: "https://x/a.jpg?token=1", fotoPath: "o1/a.jpg", partida, autor: "Juan Pérez" },
      { id: "r2", cantidad: 20.5, comentario: null, creado_en: "2026-11-05T14:32:00Z", anulado: false, fotoUrl: null, fotoPath: null, partida, autor: "Juan Pérez" },
    ]);
  });

  it("con firmarFotos en false no firma nada: devuelve la ruta de la foto y fotoUrl null", async () => {
    const { cliente, createSignedUrls, bucket } = clienteFalso(
      [fila({ id: "r1", foto_path: "o1/a.jpg" }), fila({ id: "r2", foto_path: null })],
      [{ path: "o1/a.jpg", signedUrl: "https://x/a.jpg?token=1" }],
    );
    const feed = await cargarFeed(cliente, { obraId: "o1" }, 50, { firmarFotos: false });
    expect(bucket).not.toHaveBeenCalled();
    expect(createSignedUrls).not.toHaveBeenCalled();
    expect(feed.map((r) => [r.id, r.fotoPath, r.fotoUrl])).toEqual([
      ["r1", "o1/a.jpg", null],
      ["r2", null, null],
    ]);
  });

  it("no pide firmas si ningún reporte tiene foto, y deja el autor vacío si no se puede leer", async () => {
    const { cliente, createSignedUrls } = clienteFalso([fila({ autor: null })]);
    const feed = await cargarFeed(cliente, { autorId: "u1" });
    expect(createSignedUrls).not.toHaveBeenCalled();
    expect(feed[0].autor).toBe("");
  });

  it("deja la foto en null si Storage no la firmó", async () => {
    const { cliente } = clienteFalso([fila({ foto_path: "o1/a.jpg" })], []);
    const feed = await cargarFeed(cliente, { obraId: "o1" });
    expect(feed[0].fotoUrl).toBeNull();
    expect(feed[0].fotoPath).toBe("o1/a.jpg");
  });

  it("propaga el error de la consulta", async () => {
    const { cliente } = clienteFalso([], [], new Error("boom"));
    await expect(cargarFeed(cliente, { obraId: "o1" })).rejects.toThrow("boom");
  });
});
