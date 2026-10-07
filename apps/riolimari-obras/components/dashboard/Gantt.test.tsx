import { render, screen, within } from "@testing-library/react";
import { construirArbol } from "@pyxis/riolimari-core/avance/arbol";
import { Gantt } from "./Gantt";

const hoja = (id: string, codigo: string, descripcion: string, inicio: string, fin: string) => ({
  id, parent_id: null, codigo, descripcion, unidad: "kg", cantidad: 100, precio_unitario: 1,
  fecha_inicio: inicio, fecha_fin: fin, orden: 0,
});

const enfierradura = (ejecutado: number, hoy = "2026-11-05") =>
  construirArbol([hoja("h", "1.1", "Enfierradura", "2026-11-01", "2026-11-10")], new Map([["h", ejecutado]]), hoy);

describe("Gantt", () => {
  it("dibuja una barra por partida con fechas y su avance real", () => {
    render(<Gantt raices={enfierradura(40)} hoy="2026-11-05" />);
    expect(screen.getByText("1.1 Enfierradura")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Avance 1.1: 40,0%" })).toHaveStyle({ width: "40%" });
    expect(screen.getByText("Línea negra: hoy")).toBeInTheDocument();
  });

  it("explica cuando no hay fechas", () => {
    render(<Gantt raices={[]} hoy="2026-11-05" />);
    expect(screen.getByText("Las partidas no tienen fechas: no hay Gantt que mostrar.")).toBeInTheDocument();
  });

  it("expone el avance como progressbar con valores 0–100", () => {
    render(<Gantt raices={enfierradura(40)} hoy="2026-11-05" />);
    const barra = screen.getByRole("progressbar", { name: "Avance 1.1: 40,0%" });
    expect(barra).toHaveAttribute("aria-valuemin", "0");
    expect(barra).toHaveAttribute("aria-valuemax", "100");
    expect(barra).toHaveAttribute("aria-valuenow", "40");
  });

  it("topa el valor del progressbar en 100 aunque lo ejecutado pase de lo presupuestado", () => {
    render(<Gantt raices={enfierradura(150)} hoy="2026-11-05" />);
    const barra = screen.getByRole("progressbar", { name: "Avance 1.1: 150,0%" });
    expect(barra).toHaveAttribute("aria-valuenow", "100");
    expect(barra).toHaveStyle({ width: "100%" });
  });

  it("no depende solo del color: la barra dice fechas y estado", () => {
    const { rerender } = render(<Gantt raices={enfierradura(40)} hoy="2026-11-05" />);
    expect(screen.getByTitle("1.1 Enfierradura · 01-11-2026 → 10-11-2026 · Atrasada")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuetext", "40,0% · Atrasada");

    rerender(<Gantt raices={enfierradura(100)} hoy="2026-11-05" />);
    expect(screen.getByTitle("1.1 Enfierradura · 01-11-2026 → 10-11-2026 · Terminada")).toBeInTheDocument();
  });

  it("incluye una leyenda de colores por estado", () => {
    render(<Gantt raices={enfierradura(40)} hoy="2026-11-05" />);
    const leyenda = screen.getByRole("list", { name: "Leyenda de estados" });
    expect(within(leyenda).getByText("Al día")).toBeInTheDocument();
    expect(within(leyenda).getByText("Atrasada")).toBeInTheDocument();
    expect(within(leyenda).getByText("Terminada")).toBeInTheDocument();
  });

  it("omite la leyenda de hoy cuando hoy cae fuera del rango", () => {
    render(<Gantt raices={enfierradura(40)} hoy="2027-03-01" />);
    expect(screen.queryByText("Línea negra: hoy")).not.toBeInTheDocument();
  });
});
