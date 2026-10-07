import { render, screen } from "@testing-library/react";
import Ingresar from "./page";

jest.mock("@/components/auth/FormularioIngreso", () => ({
  FormularioIngreso: ({ siguiente }: { siguiente: string }) => <p>Formulario de ingreso hacia {siguiente}</p>,
}));

describe("pantalla de ingreso", () => {
  it("muestra el logo blanco sobre el color primario y el nombre de la app antes del formulario", async () => {
    render(await Ingresar({ searchParams: Promise.resolve({ siguiente: "/terreno" }) }));

    const logo = screen.getByRole("img", { name: "Empresas Río Limarí" });
    expect(logo).toHaveAttribute("src", "/marca/logo-blanco.png");
    // El logo es blanco sobre transparente: solo se ve sobre el color primario.
    expect(logo.closest(".bg-obra-accent")).not.toBeNull();

    const titulo = screen.getByRole("heading", { level: 1, name: "Río Limarí Obras" });
    const formulario = screen.getByText("Formulario de ingreso hacia /terreno");
    expect(titulo.compareDocumentPosition(formulario) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
