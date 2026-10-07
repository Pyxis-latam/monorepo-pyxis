import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioReporte } from "./FormularioReporte";

const enviarReporte = jest.fn();
const prepararFoto = jest.fn();
const push = jest.fn();
jest.mock("@pyxis/ovalle-core/reportes/enviar", () => ({
  enviarReporte: (...a: unknown[]) => enviarReporte(...a),
  clienteReportesDesde: () => ({}),
}));
jest.mock("@/lib/supabase/navegador", () => ({ crearClienteNavegador: () => ({}) }));
jest.mock("@/lib/fotos/preparar", () => ({ prepararFoto: (...a: unknown[]) => prepararFoto(...a) }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: jest.fn() }) }));

const partida = { id: "p1", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 4200, ejecutado: 4000 };
const NOTA_FIJO = "Este reporte ya se intentó enviar. Reintenta tal cual; si necesitas corregirlo, revisa Mis reportes después.";

describe("FormularioReporte", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    enviarReporte.mockReset();
    prepararFoto.mockReset().mockImplementation(async (f: File) => f);
  });

  it("muestra cuánto lleva la partida, en cuánto quedaría con este reporte y avisa si se pasa de lo presupuestado", async () => {
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    expect(screen.getByText("Llevas 4.000 de 4.200 kg (95,2%)")).toBeInTheDocument();
    expect(screen.queryByText(/quedaría en/)).not.toBeInTheDocument();
    // Los reportes se suman: el campo es el avance de este reporte, no el total acumulado.
    await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "300");
    expect(screen.getByText("Con este reporte quedaría en 102,4%")).toBeInTheDocument();
    expect(screen.getByText("Con este reporte se supera lo presupuestado. Puedes enviarlo igual.")).toBeInTheDocument();
  });

  it("no dice en cuánto quedaría si la cantidad no es válida", async () => {
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "0");
    expect(screen.queryByText(/quedaría en/)).not.toBeInTheDocument();
  });

  it("envía con el mismo id en el reintento y conserva lo escrito si falla", async () => {
    enviarReporte
      .mockResolvedValueOnce({ ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true, insertIntentado: true })
      .mockResolvedValueOnce({ ok: true });
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "12,5");
    await userEvent.type(screen.getByLabelText("Comentario (opcional)"), "Sector norte");
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo enviar el reporte");
    expect(screen.getByLabelText("Comentario (opcional)")).toHaveValue("Sector norte");

    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    const [, primero, fotoYaSubida1] = enviarReporte.mock.calls[0];
    const [, segundo, fotoYaSubida2] = enviarReporte.mock.calls[1];
    expect(segundo.id).toBe(primero.id);
    expect(primero.cantidad).toBe(12.5);
    expect([fotoYaSubida1, fotoYaSubida2]).toEqual([false, true]);
    expect(push).toHaveBeenCalledWith("/terreno/obras/o1?enviado=1");
  });

  describe("al cambiar la foto tras un envío fallido", () => {
    const FALLO_FOTO = { ok: false, mensaje: "No se pudo subir la foto. Revisa la conexión y reintenta.", fotoSubida: false, insertIntentado: false };
    const FALLO_INSERT = { ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true, insertIntentado: true };
    const vieja = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const nueva = new File(["b"], "b.jpg", { type: "image/jpeg" });

    it("si falló la subida (no se intentó insertar), otra foto va con un id nuevo y se sube", async () => {
      enviarReporte.mockResolvedValueOnce(FALLO_FOTO).mockResolvedValueOnce({ ok: true });
      render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
      await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "5");
      await userEvent.upload(screen.getByLabelText("Foto (opcional)"), vieja);
      await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
      await screen.findByRole("alert");
      expect(screen.getByLabelText("Foto (opcional)")).toBeEnabled();

      await userEvent.upload(screen.getByLabelText("Foto (opcional)"), nueva);
      await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      const [, primero, subida1] = enviarReporte.mock.calls[0];
      const [, segundo, subida2] = enviarReporte.mock.calls[1];
      expect(primero.foto).toBe(vieja);
      expect(segundo.foto).toBe(nueva);
      expect(segundo.id).not.toBe(primero.id);
      expect([subida1, subida2]).toEqual([false, false]);
    });

    it("si falló la subida, quitar la foto también usa un id nuevo y no la manda", async () => {
      enviarReporte.mockResolvedValueOnce(FALLO_FOTO).mockResolvedValueOnce({ ok: true });
      render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
      await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "5");
      await userEvent.upload(screen.getByLabelText("Foto (opcional)"), vieja);
      await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
      await screen.findByRole("alert");

      fireEvent.change(screen.getByLabelText("Foto (opcional)"), { target: { files: [] } });
      await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      const [, primero] = enviarReporte.mock.calls[0];
      const [, segundo, subida2] = enviarReporte.mock.calls[1];
      expect(segundo.foto).toBeNull();
      expect(segundo.id).not.toBe(primero.id);
      expect(subida2).toBe(false);
    });

    it("si falló el insert (pudo llegar a la BD), bloquea la foto y reintenta con el mismo id", async () => {
      enviarReporte.mockResolvedValueOnce(FALLO_INSERT).mockResolvedValueOnce({ ok: true });
      render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
      await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "5");
      await userEvent.upload(screen.getByLabelText("Foto (opcional)"), vieja);
      await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
      await screen.findByRole("alert");

      expect(screen.getByLabelText("Foto (opcional)")).toBeDisabled();
      expect(screen.getByText(NOTA_FIJO)).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      const [, primero, subida1] = enviarReporte.mock.calls[0];
      const [, segundo, subida2] = enviarReporte.mock.calls[1];
      expect(segundo.id).toBe(primero.id);
      expect(segundo.foto).toBe(vieja);
      expect([subida1, subida2]).toEqual([false, true]);
    });
  });

  describe("tras un insert intentado (el reporte pudo llegar a la BD)", () => {
    const FALLO_INSERT = { ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: false, insertIntentado: true };

    it("bloquea cantidad, modo y comentario, y el reintento manda el mismo id con los mismos datos", async () => {
      enviarReporte.mockResolvedValueOnce(FALLO_INSERT).mockResolvedValueOnce({ ok: true });
      render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
      await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "12,5");
      await userEvent.type(screen.getByLabelText("Comentario (opcional)"), "Sector norte");
      await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
      await screen.findByRole("alert");

      // Si el primer insert llegó, un reintento con otros valores daría 23505 ("enviado") y la BD guardaría los viejos.
      expect(screen.getByLabelText("Avance de este reporte (kg)")).toBeDisabled();
      expect(screen.getByRole("button", { name: "kg" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "%" })).toBeDisabled();
      expect(screen.getByLabelText("Comentario (opcional)")).toBeDisabled();
      expect(screen.getByLabelText("Foto (opcional)")).toBeDisabled();
      expect(screen.getByText(NOTA_FIJO)).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "9");
      await userEvent.click(screen.getByRole("button", { name: "%" }));
      await userEvent.type(screen.getByLabelText("Comentario (opcional)"), " y sur");
      await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

      const [, primero] = enviarReporte.mock.calls[0];
      const [, segundo] = enviarReporte.mock.calls[1];
      expect(segundo).toEqual(primero);
      expect(segundo).toMatchObject({ cantidad: 12.5, comentario: "Sector norte", foto: null });
      expect(push).toHaveBeenCalledWith("/terreno/obras/o1?enviado=1");
    });

    it("si enviarReporte lanza una excepción también deja fijo el reporte (el insert pudo salir)", async () => {
      const foto = new File(["a"], "a.jpg", { type: "image/jpeg" });
      enviarReporte.mockRejectedValueOnce(new Error("Failed to fetch")).mockResolvedValueOnce({ ok: true });
      render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
      await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "5");
      await userEvent.upload(screen.getByLabelText("Foto (opcional)"), foto);
      await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Failed to fetch");
      expect(screen.getByLabelText("Avance de este reporte (kg)")).toBeDisabled();
      expect(screen.getByRole("button", { name: "%" })).toBeDisabled();
      expect(screen.getByLabelText("Comentario (opcional)")).toBeDisabled();
      expect(screen.getByLabelText("Foto (opcional)")).toBeDisabled();
      expect(screen.getByText(NOTA_FIJO)).toBeInTheDocument();

      await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
      const [, primero] = enviarReporte.mock.calls[0];
      const [, segundo] = enviarReporte.mock.calls[1];
      expect(segundo.id).toBe(primero.id);
      expect(segundo.foto).toBe(foto);
      expect(segundo.cantidad).toBe(5);
    });

    it("si falla preparar la foto (aún no se envió nada), no deja fijo el reporte", async () => {
      prepararFoto.mockRejectedValueOnce(new Error("La foto es muy pesada y no se pudo reducir. Prueba con otra."));
      render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
      await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "5");
      await userEvent.upload(screen.getByLabelText("Foto (opcional)"), new File(["a"], "a.jpg", { type: "image/jpeg" }));
      await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("La foto es muy pesada");
      expect(enviarReporte).not.toHaveBeenCalled();
      expect(screen.getByLabelText("Foto (opcional)")).toBeEnabled();
      expect(screen.getByLabelText("Avance de este reporte (kg)")).toBeEnabled();
      expect(screen.queryByText(NOTA_FIJO)).not.toBeInTheDocument();
    });
  });

  it("deshabilita todos los campos mientras envía", async () => {
    let terminar: (r: unknown) => void = () => {};
    enviarReporte.mockReturnValue(new Promise((resolve) => (terminar = resolve)));
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "5");
    expect(screen.getByLabelText("Avance de este reporte (kg)")).toBeEnabled();
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));

    expect(await screen.findByRole("button", { name: "Enviando…" })).toBeDisabled();
    expect(screen.getByLabelText("Avance de este reporte (kg)")).toBeDisabled();
    expect(screen.getByLabelText("Comentario (opcional)")).toBeDisabled();
    expect(screen.getByLabelText("Foto (opcional)")).toBeDisabled();
    expect(screen.getByRole("button", { name: "%" })).toBeDisabled();

    await act(async () => terminar({ ok: true }));
    expect(push).toHaveBeenCalledWith("/terreno/obras/o1?enviado=1");
  });

  it("en modo % convierte a la unidad", async () => {
    enviarReporte.mockResolvedValue({ ok: true });
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.click(screen.getByRole("button", { name: "%" }));
    await userEvent.type(screen.getByLabelText("Avance de este reporte (%)"), "1");
    expect(screen.getByText("= 42 kg")).toBeInTheDocument();
    expect(screen.getByText("Con este reporte quedaría en 96,2%")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(enviarReporte.mock.calls[0][1].cantidad).toBe(42);
  });

  it("no envía cantidades inválidas", async () => {
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Avance de este reporte (kg)"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa una cantidad mayor que 0.");
    expect(enviarReporte).not.toHaveBeenCalled();
  });
});
