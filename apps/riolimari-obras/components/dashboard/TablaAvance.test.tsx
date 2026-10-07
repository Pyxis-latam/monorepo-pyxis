import { render, screen, within } from "@testing-library/react";
import { construirArbol } from "@pyxis/riolimari-core/avance/arbol";
import { TablaAvance } from "./TablaAvance";

const raices = construirArbol(
  [
    { id: "c", parent_id: null, codigo: "1", descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
    { id: "h", parent_id: "c", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-01", fecha_fin: "2026-11-11", orden: 1 },
  ],
  new Map([["h", 1050]]),
  "2026-11-06",
);

describe("TablaAvance", () => {
  it("muestra cada partida con presupuestado, ejecutado, %, monto y estado", () => {
    render(<TablaAvance raices={raices} />);
    const fila = screen.getByRole("row", { name: /Enfierradura losa P3/ });
    expect(within(fila).getByText("4.200 kg")).toBeInTheDocument();
    expect(within(fila).getByText("1.050 kg")).toBeInTheDocument();
    expect(within(fila).getByText("25,0%")).toBeInTheDocument();
    expect(within(fila).getByText("$1.207.500")).toBeInTheDocument();
    expect(within(fila).getByText("Atrasada")).toBeInTheDocument();
  });

  it("muestra los capítulos con su total en pesos", () => {
    render(<TablaAvance raices={raices} />);
    const fila = screen.getByRole("row", { name: /Obra gruesa/ });
    expect(within(fila).getByText("$4.830.000")).toBeInTheDocument();
  });

  it("avisa cuando el filtro no deja partidas", () => {
    render(<TablaAvance raices={[]} />);
    expect(screen.getByText("No hay partidas para este filtro.")).toBeInTheDocument();
  });
});
