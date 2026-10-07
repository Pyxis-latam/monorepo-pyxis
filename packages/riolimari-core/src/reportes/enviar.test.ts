import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../database.types";
import { clienteReportesDesde, enviarReporte, type ClienteReportes } from "./enviar";

const datos = { id: "r1", obraId: "o1", partidaId: "p1", autorId: "u1", cantidad: 20, comentario: "  listo ", foto: new Blob(["x"]) };

function cliente(over: Partial<ClienteReportes> = {}): ClienteReportes & { subirFoto: jest.Mock; insertarReporte: jest.Mock } {
  return {
    subirFoto: jest.fn().mockResolvedValue({ error: null }),
    insertarReporte: jest.fn().mockResolvedValue({ error: null }),
    ...over,
  } as never;
}

describe("enviarReporte", () => {
  it("sube la foto en la ruta obra/autor/reporte e inserta con id fijo", async () => {
    const c = cliente();
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({ ok: true });
    expect(c.subirFoto).toHaveBeenCalledWith("o1/u1/r1.jpg", datos.foto);
    expect(c.insertarReporte).toHaveBeenCalledWith({
      id: "r1", obra_id: "o1", partida_id: "p1", autor: "u1", cantidad: 20, comentario: "listo", foto_path: "o1/u1/r1.jpg",
    });
  });

  it("acepta la foto como bytes (app móvil)", async () => {
    const c = cliente();
    const bytes = new ArrayBuffer(4);
    await expect(enviarReporte(c, { ...datos, foto: bytes }, false)).resolves.toEqual({ ok: true });
    expect(c.subirFoto).toHaveBeenCalledWith("o1/u1/r1.jpg", bytes);
  });

  it("sin foto ni comentario manda nulls", async () => {
    const c = cliente();
    await enviarReporte(c, { ...datos, foto: null, comentario: " " }, false);
    expect(c.subirFoto).not.toHaveBeenCalled();
    expect(c.insertarReporte).toHaveBeenCalledWith(expect.objectContaining({ comentario: null, foto_path: null }));
  });

  it("un reintento no vuelve a subir la foto ya subida", async () => {
    const c = cliente();
    await enviarReporte(c, datos, true);
    expect(c.subirFoto).not.toHaveBeenCalled();
    expect(c.insertarReporte).toHaveBeenCalledWith(expect.objectContaining({ foto_path: "o1/u1/r1.jpg" }));
  });

  it("si la foto ya existía (reintento tras corte), sigue", async () => {
    const c = cliente({ subirFoto: jest.fn().mockResolvedValue({ error: { message: "The resource already exists", statusCode: "409" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({ ok: true });
  });

  it("un insert duplicado (doble envío) cuenta como éxito", async () => {
    const c = cliente({ insertarReporte: jest.fn().mockResolvedValue({ error: { code: "23505", message: "duplicate key" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({ ok: true });
  });

  it("si falla la foto, avisa y no inserta", async () => {
    const c = cliente({ subirFoto: jest.fn().mockResolvedValue({ error: { message: "network" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({
      ok: false, mensaje: "No se pudo subir la foto. Revisa la conexión y reintenta.", fotoSubida: false, insertIntentado: false,
    });
    expect(c.insertarReporte).not.toHaveBeenCalled();
  });

  it("si falla el insert, recuerda que la foto ya subió", async () => {
    const c = cliente({ insertarReporte: jest.fn().mockResolvedValue({ error: { message: "network" } }) });
    await expect(enviarReporte(c, datos, false)).resolves.toEqual({
      ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true, insertIntentado: true,
    });
  });

  it("si falla el insert de un reporte sin foto, no dice que la foto subió", async () => {
    const c = cliente({ insertarReporte: jest.fn().mockResolvedValue({ error: { message: "network" } }) });
    await expect(enviarReporte(c, { ...datos, foto: null }, false)).resolves.toEqual({
      ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: false, insertIntentado: true,
    });
  });
});

describe("clienteReportesDesde", () => {
  function supabaseFalso(respuestas: { subida?: unknown; insercion?: unknown } = {}) {
    const upload = jest.fn().mockResolvedValue({ error: null, ...(respuestas.subida as object) });
    const insert = jest.fn().mockResolvedValue({ error: null, ...(respuestas.insercion as object) });
    const from = jest.fn((tabla: string) => (tabla === "reportes" ? { insert } : {}));
    const storageFrom = jest.fn(() => ({ upload }));
    const supabase = { from, storage: { from: storageFrom } } as unknown as SupabaseClient<Database>;
    return { supabase, upload, insert, from, storageFrom };
  }

  it("sube bytes como image/jpeg", async () => {
    const f = supabaseFalso();
    const bytes = new ArrayBuffer(4);
    await expect(clienteReportesDesde(f.supabase).subirFoto("o1/u1/r1.jpg", bytes)).resolves.toEqual({ error: null });
    expect(f.storageFrom).toHaveBeenCalledWith("fotos");
    expect(f.upload).toHaveBeenCalledWith("o1/u1/r1.jpg", bytes, { contentType: "image/jpeg" });
  });

  it("sube un Blob con su tipo, o image/jpeg si no tiene", async () => {
    const f = supabaseFalso();
    const c = clienteReportesDesde(f.supabase);
    const png = new Blob(["x"], { type: "image/png" });
    const sinTipo = new Blob(["x"]);
    await c.subirFoto("a.jpg", png);
    await c.subirFoto("b.jpg", sinTipo);
    expect(f.upload).toHaveBeenNthCalledWith(1, "a.jpg", png, { contentType: "image/png" });
    expect(f.upload).toHaveBeenNthCalledWith(2, "b.jpg", sinTipo, { contentType: "image/jpeg" });
  });

  it("nunca sobrescribe una foto existente (las rutas son inmutables y se sirven con caché de un año)", async () => {
    const f = supabaseFalso();
    await clienteReportesDesde(f.supabase).subirFoto("a.jpg", new Blob(["x"]));
    expect(f.upload.mock.calls[0][2]).not.toHaveProperty("upsert");
  });

  it("traduce el error de Storage conservando el statusCode", async () => {
    const f = supabaseFalso({ subida: { error: { message: "The resource already exists", statusCode: "409", name: "x" } } });
    await expect(clienteReportesDesde(f.supabase).subirFoto("a.jpg", new Blob(["x"]))).resolves.toEqual({
      error: { message: "The resource already exists", statusCode: "409" },
    });
  });

  it("inserta en reportes y traduce el error con su código", async () => {
    const fila = { id: "r1", obra_id: "o1", partida_id: "p1", autor: "u1", cantidad: 1, comentario: null, foto_path: null };
    const f = supabaseFalso({ insercion: { error: { code: "23505", message: "duplicate key", details: "", hint: "" } } });
    await expect(clienteReportesDesde(f.supabase).insertarReporte(fila)).resolves.toEqual({
      error: { code: "23505", message: "duplicate key" },
    });
    expect(f.from).toHaveBeenCalledWith("reportes");
    expect(f.insert).toHaveBeenCalledWith(fila);
  });
});
