import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioReporte } from "./FormularioReporte";

const enviarReporte = jest.fn();
const push = jest.fn();
jest.mock("@pyxis/ovalle-core/reportes/enviar", () => ({
  enviarReporte: (...a: unknown[]) => enviarReporte(...a),
  clienteReportesDesde: () => ({}),
}));
jest.mock("@/lib/supabase/navegador", () => ({ crearClienteNavegador: () => ({}) }));
jest.mock("@/lib/fotos/preparar", () => ({ prepararFoto: async (f: File) => f }));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: jest.fn() }) }));

const partida = { id: "p1", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 4200, ejecutado: 4000 };

describe("FormularioReporte", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra lo que falta y avisa si se pasa de lo presupuestado", async () => {
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    expect(screen.getByText("Faltan 200 kg de 4.200 kg")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Cantidad ejecutada (kg)"), "300");
    expect(screen.getByText("Con este reporte se supera lo presupuestado. Puedes enviarlo igual.")).toBeInTheDocument();
  });

  it("envía con el mismo id en el reintento y conserva lo escrito si falla", async () => {
    enviarReporte
      .mockResolvedValueOnce({ ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true })
      .mockResolvedValueOnce({ ok: true });
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Cantidad ejecutada (kg)"), "12,5");
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

  it("si cambia la foto después de que otra ya subió, la reporta con un id nuevo (la ruta de la foto subida es inmutable)", async () => {
    enviarReporte
      .mockResolvedValueOnce({ ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true })
      .mockResolvedValueOnce({ ok: true });
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Cantidad ejecutada (kg)"), "5");
    const vieja = new File(["a"], "a.jpg", { type: "image/jpeg" });
    const nueva = new File(["b"], "b.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByLabelText("Foto (opcional)"), vieja);
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    await screen.findByRole("alert");

    await userEvent.upload(screen.getByLabelText("Foto (opcional)"), nueva);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    const [, primero, subida1] = enviarReporte.mock.calls[0];
    const [, segundo, subida2] = enviarReporte.mock.calls[1];
    expect(primero.foto).toBe(vieja);
    expect(segundo.foto).toBe(nueva);
    expect(segundo.id).not.toBe(primero.id);
    expect([subida1, subida2]).toEqual([false, false]);
  });

  it("en modo % convierte a la unidad", async () => {
    enviarReporte.mockResolvedValue({ ok: true });
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.click(screen.getByRole("button", { name: "%" }));
    await userEvent.type(screen.getByLabelText("Porcentaje ejecutado"), "1");
    expect(screen.getByText("= 42 kg")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(enviarReporte.mock.calls[0][1].cantidad).toBe(42);
  });

  it("no envía cantidades inválidas", async () => {
    render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} />);
    await userEvent.type(screen.getByLabelText("Cantidad ejecutada (kg)"), "0");
    await userEvent.click(screen.getByRole("button", { name: "Enviar reporte" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa una cantidad mayor que 0.");
    expect(enviarReporte).not.toHaveBeenCalled();
  });
});
