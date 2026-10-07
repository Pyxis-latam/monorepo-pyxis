import { render, screen } from "@testing-library/react";
import { construirArbol } from "@pyxis/ovalle-core/avance/arbol";
import { Gantt } from "./Gantt";

describe("Gantt", () => {
  it("dibuja una barra por partida con fechas y su avance real", () => {
    const raices = construirArbol(
      [{ id: "h", parent_id: null, codigo: "1.1", descripcion: "Enfierradura", unidad: "kg", cantidad: 100, precio_unitario: 1, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-10", orden: 0 }],
      new Map([["h", 40]]),
      "2026-11-05",
    );
    render(<Gantt raices={raices} hoy="2026-11-05" />);
    expect(screen.getByText("1.1 Enfierradura")).toBeInTheDocument();
    expect(screen.getByLabelText("Avance 40,0%")).toHaveStyle({ width: "40%" });
    expect(screen.getByLabelText("Hoy")).toBeInTheDocument();
  });

  it("explica cuando no hay fechas", () => {
    render(<Gantt raices={[]} hoy="2026-11-05" />);
    expect(screen.getByText("Las partidas no tienen fechas: no hay Gantt que mostrar.")).toBeInTheDocument();
  });
});
