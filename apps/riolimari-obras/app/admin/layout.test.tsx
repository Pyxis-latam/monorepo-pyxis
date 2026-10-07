import { render, screen, within } from "@testing-library/react";
import AdminLayout from "./layout";

jest.mock("@/lib/auth/sesion", () => ({
  exigirRol: jest.fn().mockResolvedValue({ id: "u1", nombre: "Ana Admin", email: "ana@riolimari.cl", rol: "admin" }),
}));

describe("layout del admin", () => {
  it("lleva un encabezado del color primario con el logo, el nombre de la app y los enlaces en blanco", async () => {
    render(await AdminLayout({ children: <p>Contenido</p> }));

    const encabezado = screen.getByRole("banner");
    expect(encabezado).toHaveClass("bg-obra-accent", "text-white");
    expect(within(encabezado).getByRole("img", { name: "Empresas Río Limarí" })).toHaveAttribute("src", "/marca/logo-blanco.png");
    expect(within(encabezado).getByText("Río Limarí Obras")).toBeInTheDocument();
    expect(within(encabezado).getByRole("link", { name: "Obras" })).toHaveAttribute("href", "/admin");
    expect(within(encabezado).getByRole("link", { name: "Usuarios" })).toHaveAttribute("href", "/admin/usuarios");
    expect(within(encabezado).getByText("Ana Admin")).toBeInTheDocument();
    expect(within(encabezado).getByRole("button", { name: "Salir" })).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });
});
