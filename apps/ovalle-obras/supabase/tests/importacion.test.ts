import { adminServicio, crearUsuario } from "./helpers";

// Los tipos generados no declaran anulables los parámetros de la RPC (p_obra_id, p_nombre),
// aunque la función los acepta null: se pasa null con el tipo que el cliente exige.
const nulo = null as unknown as string;

const partida = (codigo: string, codigo_padre: string | null, orden: number, cantidad: number | null = 10) => ({
  codigo,
  codigo_padre,
  descripcion: `Partida ${codigo}`,
  unidad: cantidad === null ? null : "m2",
  cantidad,
  precio_unitario: cantidad === null ? null : 1000,
  fecha_inicio: "2026-11-01",
  fecha_fin: "2026-11-10",
  orden,
});

describe("aplicar_importacion", () => {
  it("crea una obra con su árbol de partidas y registra la importación", async () => {
    const admin = await crearUsuario("admin");
    const { data: obraId, error } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: nulo,
      p_nombre: "Edificio Ñuñoa",
      p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1)],
      p_archivo_path: "2026-10-06/x.xlsx",
    });
    expect(error).toBeNull();
    const { data: partidas } = await adminServicio
      .from("partidas")
      .select("codigo, parent_id, id")
      .eq("obra_id", obraId!)
      .order("orden");
    expect(partidas!.map((p) => p.codigo)).toEqual(["1", "1.1"]);
    expect(partidas![1].parent_id).toBe(partidas![0].id);
    const { data: imps } = await adminServicio.from("importaciones").select("filas").eq("obra_id", obraId!);
    expect(imps).toEqual([{ filas: 2 }]);
  });

  it("reimporta: actualiza por código, agrega y elimina sin tocar reportes", async () => {
    const admin = await crearUsuario("admin");
    const { data: obraId } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: nulo, p_nombre: "Obra", p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1), partida("1.2", "1", 2)], p_archivo_path: "a.xlsx",
    });
    const { data: hoja } = await adminServicio.from("partidas").select("id").eq("obra_id", obraId!).eq("codigo", "1.1").single();
    await adminServicio.from("reportes").insert({ obra_id: obraId!, partida_id: hoja!.id, autor: admin.id, cantidad: 4 });

    const { error } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: obraId!, p_nombre: nulo,
      p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1, 50), partida("1.3", "1", 2)],
      p_archivo_path: "b.xlsx",
    });
    expect(error).toBeNull();
    const { data: partidas } = await adminServicio.from("partidas").select("id, codigo, cantidad").eq("obra_id", obraId!).order("orden");
    expect(partidas!.map((p) => p.codigo)).toEqual(["1", "1.1", "1.3"]);
    expect(partidas![1]).toMatchObject({ id: hoja!.id, cantidad: 50 });
  });

  it("rechaza eliminar partidas con reportes y no cambia nada", async () => {
    const admin = await crearUsuario("admin");
    const { data: obraId } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: nulo, p_nombre: "Obra", p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1)], p_archivo_path: "a.xlsx",
    });
    const { data: hoja } = await adminServicio.from("partidas").select("id").eq("obra_id", obraId!).eq("codigo", "1.1").single();
    await adminServicio.from("reportes").insert({ obra_id: obraId!, partida_id: hoja!.id, autor: admin.id, cantidad: 4 });

    const { error } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: obraId!, p_nombre: nulo, p_partidas: [partida("1", null, 0, null), partida("1.2", "1", 1)], p_archivo_path: "b.xlsx",
    });
    expect(error?.message).toContain("1.1");
    const { data: partidas } = await adminServicio.from("partidas").select("codigo").eq("obra_id", obraId!);
    expect(partidas!.map((p) => p.codigo).sort()).toEqual(["1", "1.1"]);
  });

  it("rechaza volver capítulo una partida con reportes, aunque estén anulados", async () => {
    const admin = await crearUsuario("admin");
    const { data: obraId } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: nulo, p_nombre: "Obra", p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1)], p_archivo_path: "a.xlsx",
    });
    const { data: hoja } = await adminServicio.from("partidas").select("id").eq("obra_id", obraId!).eq("codigo", "1.1").single();
    const { data: reporte } = await adminServicio
      .from("reportes")
      .insert({ obra_id: obraId!, partida_id: hoja!.id, autor: admin.id, cantidad: 4 })
      .select("id")
      .single();
    await adminServicio.from("reportes").update({ anulado: true, anulado_por: admin.id }).eq("id", reporte!.id);

    const { error } = await admin.cliente.rpc("aplicar_importacion", {
      p_obra_id: obraId!, p_nombre: nulo, p_partidas: [partida("1", null, 0, null), partida("1.1", "1", 1, null)], p_archivo_path: "b.xlsx",
    });
    expect(error?.message).toContain("1.1");
    const { data: actual } = await adminServicio.from("partidas").select("cantidad").eq("id", hoja!.id).single();
    expect(actual!.cantidad).toBe(10);
    const { data: imps } = await adminServicio.from("importaciones").select("filas").eq("obra_id", obraId!);
    expect(imps).toEqual([{ filas: 2 }]);
  });

  it("solo un admin puede importar", async () => {
    const terreno = await crearUsuario("terreno");
    const { error } = await terreno.cliente.rpc("aplicar_importacion", {
      p_obra_id: nulo, p_nombre: "Obra", p_partidas: [partida("1", null, 0)], p_archivo_path: "a.xlsx",
    });
    expect(error?.code).toBe("42501");
  });
});
