import { render, screen } from "@testing-library/react";
import { Feed } from "./Feed";

jest.mock("@/app/admin/obras/[id]/acciones", () => ({ anularReporte: jest.fn() }));

const base = {
  id: "r1", cantidad: 20, comentario: "Sector norte listo", creado_en: "2026-11-05T14:32:00Z", anulado: false,
  fotoUrl: "https://x/foto.jpg", partida: { codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg" }, autor: "Juan Pérez",
};

describe("Feed", () => {
  it("muestra autor, partida, cantidad, comentario, foto y hora de Chile", () => {
    render(<Feed reportes={[base]} obraId="o1" />);
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("20 kg · 1.1 Enfierradura losa P3")).toBeInTheDocument();
    expect(screen.getByText("Sector norte listo")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Foto del reporte de Juan Pérez" })).toBeInTheDocument();
    expect(screen.getByText("05-11-2026 11:32")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Anular" })).toBeInTheDocument();
  });

  it("marca los anulados y no ofrece anularlos de nuevo", () => {
    render(<Feed reportes={[{ ...base, anulado: true }]} obraId="o1" />);
    expect(screen.getByText("Anulado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeInTheDocument();
  });

  it("tiene un estado vacío", () => {
    render(<Feed reportes={[]} obraId="o1" />);
    expect(screen.getByText("Todavía no hay reportes de terreno.")).toBeInTheDocument();
  });
});
