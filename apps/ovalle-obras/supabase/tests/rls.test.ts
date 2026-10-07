import { adminServicio, crearObraConPartidas, crearUsuario } from "./helpers";

describe("seguridad de datos", () => {
  it("terreno reporta en una hoja de obra activa; obra y hora las pone el servidor", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas();
    const id = crypto.randomUUID();
    const { error } = await terreno.cliente.from("reportes").insert({
      id,
      obra_id: crypto.randomUUID(), // intento de falsear la obra: el trigger lo corrige
      partida_id: hojaId,
      autor: terreno.id,
      cantidad: 10,
      creado_en: "2000-01-01T00:00:00Z",
    });
    expect(error).toBeNull();
    const { data } = await adminServicio.from("reportes").select("*").eq("id", id).single();
    expect(data!.obra_id).toBe(obraId);
    expect(new Date(data!.creado_en).getFullYear()).toBeGreaterThan(2025);
  });

  it("un reporte repetido con el mismo id no duplica avance (23505)", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas();
    const fila = { id: crypto.randomUUID(), obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 5 };
    expect((await terreno.cliente.from("reportes").insert(fila)).error).toBeNull();
    const repetido = await terreno.cliente.from("reportes").insert(fila);
    expect(repetido.error?.code).toBe("23505");
    const { data } = await adminServicio.from("partida_ejecutado").select("ejecutado").eq("partida_id", hojaId).single();
    expect(Number(data!.ejecutado)).toBe(5);
  });

  it("terreno no puede reportar a nombre de otro usuario", async () => {
    const terreno = await crearUsuario("terreno");
    const otro = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas();
    const { error } = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: hojaId, autor: otro.id, cantidad: 1 });
    expect(error).not.toBeNull();
  });

  it("no se puede reportar sobre un capítulo ni con cantidad 0", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, capituloId, hojaId } = await crearObraConPartidas();
    const enCapitulo = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: capituloId, autor: terreno.id, cantidad: 1 });
    expect(enCapitulo.error).not.toBeNull();
    const cero = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 0 });
    expect(cero.error).not.toBeNull();
  });

  it("terreno no ve ni reporta en obras cerradas", async () => {
    const terreno = await crearUsuario("terreno");
    const { obraId, hojaId } = await crearObraConPartidas("cerrada");
    const { data: obras } = await terreno.cliente.from("obras").select("id").eq("id", obraId);
    expect(obras).toEqual([]);
    const { error } = await terreno.cliente
      .from("reportes")
      .insert({ obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 1 });
    expect(error).not.toBeNull();
  });

  it("terreno no puede anular; admin sí", async () => {
    const terreno = await crearUsuario("terreno");
    const admin = await crearUsuario("admin");
    const { obraId, hojaId } = await crearObraConPartidas();
    const id = crypto.randomUUID();
    await terreno.cliente.from("reportes").insert({ id, obra_id: obraId, partida_id: hojaId, autor: terreno.id, cantidad: 3 });

    await terreno.cliente.from("reportes").update({ anulado: true }).eq("id", id);
    let { data } = await adminServicio.from("reportes").select("anulado").eq("id", id).single();
    expect(data!.anulado).toBe(false);

    const { error } = await admin.cliente
      .from("reportes")
      .update({ anulado: true, anulado_por: admin.id, anulado_en: new Date().toISOString() })
      .eq("id", id);
    expect(error).toBeNull();
    ({ data } = await adminServicio.from("reportes").select("anulado").eq("id", id).single());
    expect(data!.anulado).toBe(true);
  });

  it("terreno no ve importaciones ni otros perfiles", async () => {
    const terreno = await crearUsuario("terreno");
    await crearUsuario("admin");
    const { data: imps } = await terreno.cliente.from("importaciones").select("id");
    expect(imps).toEqual([]);
    const { data: perfiles } = await terreno.cliente.from("perfiles").select("id");
    expect(perfiles).toEqual([{ id: terreno.id }]);
  });

  it("un usuario desactivado no ve nada", async () => {
    const terreno = await crearUsuario("terreno");
    await crearObraConPartidas();
    await adminServicio.from("perfiles").update({ activo: false }).eq("id", terreno.id);
    const { data } = await terreno.cliente.from("obras").select("id");
    expect(data).toEqual([]);
  });

  it("terreno sube fotos solo a su propia carpeta", async () => {
    const terreno = await crearUsuario("terreno");
    const otro = await crearUsuario("terreno");
    const { obraId } = await crearObraConPartidas();
    const foto = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xd9])], { type: "image/jpeg" });
    const propia = await terreno.cliente.storage.from("fotos").upload(`${obraId}/${terreno.id}/${crypto.randomUUID()}.jpg`, foto);
    expect(propia.error).toBeNull();
    const ajena = await terreno.cliente.storage.from("fotos").upload(`${obraId}/${otro.id}/${crypto.randomUUID()}.jpg`, foto);
    expect(ajena.error).not.toBeNull();
  });
});
