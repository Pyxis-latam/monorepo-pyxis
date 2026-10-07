import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListaPartidas } from "./ListaPartidas";

const a = { id: "a", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 100, ejecutado: 30, porcentaje: 0.3, capitulo: "1 Obra gruesa" };
const b = { id: "b", codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3", cantidad: 10, ejecutado: 0, porcentaje: 0, capitulo: "1 Obra gruesa" };

describe("ListaPartidas", () => {
  it("muestra primero las en curso y enlaza al formulario", () => {
    render(<ListaPartidas obraId="o1" enCurso={[a]} todas={[a, b]} />);
    expect(screen.getByRole("heading", { name: "En curso hoy" })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Enfierradura losa P3/ })[0]).toHaveAttribute("href", "/terreno/obras/o1/partidas/a");
  });

  it("al buscar oculta las secciones y filtra", async () => {
    render(<ListaPartidas obraId="o1" enCurso={[a]} todas={[a, b]} />);
    await userEvent.type(screen.getByRole("searchbox"), "hormi");
    expect(screen.queryByRole("heading", { name: "En curso hoy" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Hormigón losa P3/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Enfierradura/ })).not.toBeInTheDocument();
  });
});
