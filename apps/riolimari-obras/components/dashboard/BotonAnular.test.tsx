import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { anularReporte } from "@/app/admin/obras/[id]/acciones";
import { BotonAnular } from "./BotonAnular";

jest.mock("@/app/admin/obras/[id]/acciones", () => ({ anularReporte: jest.fn() }));

describe("BotonAnular", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => jest.restoreAllMocks());

  it("pide confirmación y anula el reporte de esa obra", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    jest.mocked(anularReporte).mockResolvedValue(undefined);
    render(<BotonAnular reporteId="r1" obraId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(window.confirm).toHaveBeenCalledWith("¿Anular este reporte? Su cantidad deja de contar en el avance.");
    await waitFor(() => expect(anularReporte).toHaveBeenCalledWith("r1", "o1"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("no anula si se cancela la confirmación", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(false);
    render(<BotonAnular reporteId="r1" obraId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(anularReporte).not.toHaveBeenCalled();
  });

  it("avisa en vez de romper la página cuando la anulación falla", async () => {
    jest.spyOn(window, "confirm").mockReturnValue(true);
    jest.mocked(anularReporte).mockRejectedValue(new Error("El reporte no existe o ya estaba anulado."));
    render(<BotonAnular reporteId="r1" obraId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Anular" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo anular");
    expect(screen.getByRole("button", { name: "Anular" })).toBeEnabled();
  });
});
