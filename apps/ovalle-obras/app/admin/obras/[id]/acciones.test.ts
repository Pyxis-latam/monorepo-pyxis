import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteServidor } from "@/lib/supabase/servidor";
import { anularReporte } from "./acciones";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/sesion", () => ({ exigirRol: jest.fn() }));
jest.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: jest.fn() }));

/** Cliente falso que registra la cadena `from().update().eq()....select()` y responde con `resultado`. */
function clienteFalso(resultado: { data: { id: string }[] | null; error: unknown }) {
  const llamadas: { metodo: string; args: unknown[] }[] = [];
  const cadena: Record<string, unknown> = {};
  for (const metodo of ["from", "update", "eq", "select"]) {
    cadena[metodo] = (...args: unknown[]) => {
      llamadas.push({ metodo, args });
      // `select` cierra la cadena: es lo que se espera (await) y devuelve el resultado.
      return metodo === "select" ? Promise.resolve(resultado) : cadena;
    };
  }
  return { cliente: cadena, llamadas };
}

describe("anularReporte", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(exigirRol).mockResolvedValue({ id: "admin-1", nombre: "Ana", email: "ana@x.cl", rol: "admin" });
  });

  it("anula solo un reporte de esa obra que aún no está anulado y registra quién y cuándo", async () => {
    const { cliente, llamadas } = clienteFalso({ data: [{ id: "r1" }], error: null });
    jest.mocked(crearClienteServidor).mockResolvedValue(cliente as never);

    await anularReporte("r1", "o1");

    expect(exigirRol).toHaveBeenCalledWith("admin");
    expect(llamadas.map((l) => l.metodo)).toEqual(["from", "update", "eq", "eq", "eq", "select"]);
    expect(llamadas[0].args).toEqual(["reportes"]);
    expect(llamadas[1].args[0]).toEqual({
      anulado: true,
      anulado_por: "admin-1",
      anulado_en: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    expect(llamadas.filter((l) => l.metodo === "eq").map((l) => l.args)).toEqual([
      ["id", "r1"],
      ["obra_id", "o1"],
      ["anulado", false],
    ]);
    expect(llamadas[5].args).toEqual(["id"]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/obras/o1");
  });

  it("falla si no hubo nada que anular (no existe, es de otra obra o ya estaba anulado)", async () => {
    const { cliente } = clienteFalso({ data: [], error: null });
    jest.mocked(crearClienteServidor).mockResolvedValue(cliente as never);

    await expect(anularReporte("r1", "o1")).rejects.toThrow("El reporte no existe o ya estaba anulado.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("propaga el error de la base de datos", async () => {
    const { cliente } = clienteFalso({ data: null, error: new Error("boom") });
    jest.mocked(crearClienteServidor).mockResolvedValue(cliente as never);

    await expect(anularReporte("r1", "o1")).rejects.toThrow("boom");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
