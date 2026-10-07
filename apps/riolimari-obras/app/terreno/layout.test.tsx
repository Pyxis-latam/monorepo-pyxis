import { render, screen, within } from "@testing-library/react";
import TerrenoLayout from "./layout";

jest.mock("@/lib/auth/sesion", () => ({
  exigirRol: jest.fn().mockResolvedValue({ id: "u2", nombre: "Juan Terreno", email: "juan@riolimari.cl", rol: "terreno" }),
}));

describe("layout de terreno", () => {
  it("lleva un encabezado del color primario con el logo y el nombre de la app, y mantiene la navegación inferior", async () => {
    render(await TerrenoLayout({ children: <p>Contenido</p> }));

    const encabezado = screen.getByRole("banner");
    expect(encabezado).toHaveClass("bg-obra-accent", "text-white");
    expect(within(encabezado).getByRole("img", { name: "Empresas Río Limarí" })).toHaveAttribute("src", "/marca/logo-blanco.png");
    expect(within(encabezado).getByText("Río Limarí Obras")).toBeInTheDocument();

    const navegacion = screen.getByRole("navigation");
    expect(within(navegacion).getByRole("link", { name: "Partidas" })).toHaveAttribute("href", "/terreno");
    expect(within(navegacion).getByRole("link", { name: "Mis reportes" })).toHaveAttribute("href", "/terreno/reportes");
    expect(within(navegacion).getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});
