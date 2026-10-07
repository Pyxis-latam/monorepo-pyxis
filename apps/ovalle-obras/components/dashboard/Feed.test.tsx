import { render, screen } from "@testing-library/react";
import { Feed } from "./Feed";

jest.mock("@/app/admin/obras/[id]/acciones", () => ({ anularReporte: jest.fn() }));

const base = {
  id: "r1", cantidad: 20, comentario: "Sector norte listo", creado_en: "2026-11-05T14:32:00Z", anulado: false,
  fotoUrl: null, fotoPath: "o1/u1/r1.jpg", partida: { codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg" }, autor: "Juan Pérez",
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

  it("sirve la foto desde la ruta estable y cacheable, sin URLs firmadas, cargada de forma diferida", () => {
    render(<Feed reportes={[base]} obraId="o1" />);
    const img = screen.getByRole("img", { name: "Foto del reporte de Juan Pérez" });
    expect(img).toHaveAttribute("src", "/fotos/o1/u1/r1.jpg");
    expect(img).toHaveAttribute("loading", "lazy");
    expect(img).toHaveAttribute("decoding", "async");
    expect(img.closest("a")).toHaveAttribute("href", "/fotos/o1/u1/r1.jpg");
  });

  it("no dibuja foto cuando el reporte no tiene", () => {
    render(<Feed reportes={[{ ...base, fotoPath: null }]} obraId="o1" />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("marca los anulados y no ofrece anularlos de nuevo", () => {
    render(<Feed reportes={[{ ...base, anulado: true }]} obraId="o1" />);
    expect(screen.getByText("Anulado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeInTheDocument();
  });

  it("no ofrece anular cuando conAnular es false (Mis reportes de terreno)", () => {
    render(<Feed reportes={[base]} obraId="" conAnular={false} />);
    expect(screen.getByText("20 kg · 1.1 Enfierradura losa P3")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Anular" })).not.toBeInTheDocument();
  });

  it("tiene un estado vacío", () => {
    render(<Feed reportes={[]} obraId="o1" />);
    expect(screen.getByText("Todavía no hay reportes de terreno.")).toBeInTheDocument();
  });
});
