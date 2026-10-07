import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioImportacion } from "./FormularioImportacion";

const previsualizarImportacion = jest.fn();
const confirmarImportacion = jest.fn();
jest.mock("@/app/admin/obras/acciones", () => ({
  previsualizarImportacion: (fd: FormData) => previsualizarImportacion(fd),
  confirmarImportacion: (fd: FormData) => confirmarImportacion(fd),
}));

const archivo = new File(["x"], "obra.xlsx");
const partida = {
  codigo: "1.1", codigo_padre: "1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200,
  precio_unitario: 1150, fecha_inicio: "2026-11-03", fecha_fin: "2026-11-14", orden: 1,
};

describe("FormularioImportacion", () => {
  beforeEach(() => jest.clearAllMocks());

  it("muestra los errores por fila y no deja confirmar", async () => {
    previsualizarImportacion.mockResolvedValue({
      estado: "vista_previa", partidas: [partida], errores: [{ fila: 7, mensaje: "Fecha fin es anterior a fecha inicio." }], diferencias: null,
    });
    render(<FormularioImportacion />);
    await userEvent.type(screen.getByLabelText("Nombre de la obra"), "Edificio Ñuñoa");
    await userEvent.upload(screen.getByLabelText("Archivo Excel"), archivo);
    await userEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    expect(await screen.findByText("Fila 7: Fecha fin es anterior a fecha inicio.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Crear obra" })).toBeDisabled();
  });

  it("confirma enviando el mismo archivo y el nombre", async () => {
    previsualizarImportacion.mockResolvedValue({ estado: "vista_previa", partidas: [partida], errores: [], diferencias: null });
    confirmarImportacion.mockResolvedValue({ estado: "error", mensaje: "x" });
    render(<FormularioImportacion />);
    await userEvent.type(screen.getByLabelText("Nombre de la obra"), "Edificio Ñuñoa");
    await userEvent.upload(screen.getByLabelText("Archivo Excel"), archivo);
    await userEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    expect(await screen.findByText("Enfierradura")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Crear obra" }));
    const fd: FormData = confirmarImportacion.mock.calls[0][0];
    expect(fd.get("nombre")).toBe("Edificio Ñuñoa");
    expect((fd.get("archivo") as File).name).toBe("obra.xlsx");
  });

  it("en reimportación muestra el resumen de cambios y los bloqueos", async () => {
    previsualizarImportacion.mockResolvedValue({
      estado: "vista_previa", partidas: [partida], errores: [],
      diferencias: { agregadas: ["1.3"], modificadas: ["1.1"], eliminadas: ["1.2"], bloqueadas: ["1.2"] },
    });
    render(<FormularioImportacion obraId="o1" />);
    await userEvent.upload(screen.getByLabelText("Archivo Excel"), archivo);
    await userEvent.click(screen.getByRole("button", { name: "Revisar archivo" }));
    expect(await screen.findByText("1 nuevas · 1 modificadas · 1 eliminadas")).toBeInTheDocument();
    expect(screen.getByText(/tienen reportes y no se pueden eliminar ni volverse capítulo: 1\.2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aplicar cambios" })).toBeDisabled();
  });
});
