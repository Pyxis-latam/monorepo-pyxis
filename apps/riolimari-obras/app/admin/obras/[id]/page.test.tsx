import { render, screen } from "@testing-library/react";
import { construirArbol } from "@pyxis/riolimari-core/avance/arbol";
import type { PartidaPlan } from "@pyxis/riolimari-core/avance/tipos";
import { cargarFeed } from "@pyxis/riolimari-core/datos/feed";
import { cargarAvanceObra } from "@pyxis/riolimari-core/datos/obra";
import { hoyEnChile } from "@pyxis/riolimari-core/fechas";
import DashboardObra from "./page";

jest.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: jest.fn().mockResolvedValue({}) }));
jest.mock("@pyxis/riolimari-core/datos/obra", () => ({ cargarAvanceObra: jest.fn() }));
jest.mock("@pyxis/riolimari-core/datos/feed", () => ({ cargarFeed: jest.fn() }));
// El refresco en vivo abre un canal Realtime del navegador; aquí solo importa que esté en la página.
jest.mock("@/components/dashboard/RefrescoEnVivo", () => ({
  RefrescoEnVivo: ({ obraId }: { obraId: string }) => `Refresco en vivo de ${obraId}`,
}));
jest.mock("./acciones", () => ({ cambiarEstadoObra: jest.fn() }));
jest.mock("next/navigation", () => ({ notFound: jest.fn() }));

const SIN_FECHAS = "Las partidas no tienen fechas: no hay Gantt que mostrar.";
const SIN_PARTIDAS = "No hay partidas para este filtro.";

const partida = (fecha_inicio: string | null, fecha_fin: string | null): PartidaPlan => ({
  id: "h", parent_id: null, codigo: "1.1", descripcion: "Enfierradura", unidad: "kg", cantidad: 100, precio_unitario: 1,
  fecha_inicio, fecha_fin, orden: 0,
});

// Fechas lejanas: a "hoy" la partida no ha empezado, así que nunca está atrasada (independiente del reloj).
const conFechas = partida("2099-01-01", "2099-01-31");
const sinFechas = partida(null, null);

async function renderizar(partidas: PartidaPlan[], searchParams: { vista?: string; filtro?: string }) {
  const raices = construirArbol(partidas, new Map(), hoyEnChile());
  jest.mocked(cargarAvanceObra).mockResolvedValue({
    obra: { id: "o1", nombre: "Obra de prueba", estado: "activa" },
    raices,
    resumen: { porcentajeFisico: 0, montoPresupuestado: 0, montoEjecutado: 0, atrasadas: 0, hojas: raices.length },
  });
  render(await DashboardObra({ params: Promise.resolve({ id: "o1" }), searchParams: Promise.resolve(searchParams) }));
}

describe("dashboard de la obra, vista Gantt", () => {
  it("con un filtro que no deja partidas dice que no hay partidas, no que faltan fechas", async () => {
    await renderizar([conFechas], { vista: "gantt", filtro: "atrasadas" });
    expect(screen.getByText(SIN_PARTIDAS)).toBeInTheDocument();
    expect(screen.queryByText(SIN_FECHAS)).not.toBeInTheDocument();
  });

  it("mantiene el aviso de falta de fechas cuando hay partidas pero ninguna tiene fechas", async () => {
    await renderizar([sinFechas], { vista: "gantt", filtro: "todas" });
    expect(screen.getByText(SIN_FECHAS)).toBeInTheDocument();
    expect(screen.queryByText(SIN_PARTIDAS)).not.toBeInTheDocument();
  });

  it("dibuja el Gantt cuando hay partidas con fechas", async () => {
    await renderizar([conFechas], { vista: "gantt", filtro: "todas" });
    expect(screen.getByText("1.1 Enfierradura")).toBeInTheDocument();
    expect(screen.queryByText(SIN_PARTIDAS)).not.toBeInTheDocument();
  });
});

describe("dashboard de la obra, vista Reportes", () => {
  const reporte = {
    id: "r1", cantidad: 20, comentario: null, creado_en: "2026-11-05T14:32:00Z", anulado: false, fotoUrl: null, fotoPath: null,
    partida: { codigo: "1.1", descripcion: "Enfierradura", unidad: "kg" }, autor: "Juan Pérez",
  };

  beforeEach(() => jest.mocked(cargarFeed).mockReset());

  it("carga y muestra los reportes de esta obra", async () => {
    jest.mocked(cargarFeed).mockResolvedValue([reporte]);
    await renderizar([conFechas], { vista: "feed" });
    // Las fotos se sirven desde /fotos/...: no se firman URLs en cada refresco.
    expect(cargarFeed).toHaveBeenCalledWith(expect.anything(), { obraId: "o1" }, 50, { firmarFotos: false });
    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("20 kg · 1.1 Enfierradura")).toBeInTheDocument();
  });

  it("muestra el estado vacío cuando no hay reportes", async () => {
    jest.mocked(cargarFeed).mockResolvedValue([]);
    await renderizar([conFechas], { vista: "feed" });
    expect(screen.getByText("Todavía no hay reportes de terreno.")).toBeInTheDocument();
  });

  it("no carga el feed en las otras vistas, pero deja el refresco en vivo siempre visible", async () => {
    await renderizar([conFechas], { vista: "tabla" });
    expect(cargarFeed).not.toHaveBeenCalled();
    expect(screen.getByText("Refresco en vivo de o1")).toBeInTheDocument();
  });
});
