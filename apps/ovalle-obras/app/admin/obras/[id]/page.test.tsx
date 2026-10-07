import { render, screen } from "@testing-library/react";
import { construirArbol } from "@pyxis/ovalle-core/avance/arbol";
import type { PartidaPlan } from "@pyxis/ovalle-core/avance/tipos";
import { cargarAvanceObra } from "@pyxis/ovalle-core/datos/obra";
import { hoyEnChile } from "@pyxis/ovalle-core/fechas";
import DashboardObra from "./page";

jest.mock("@/lib/supabase/servidor", () => ({ crearClienteServidor: jest.fn().mockResolvedValue({}) }));
jest.mock("@pyxis/ovalle-core/datos/obra", () => ({ cargarAvanceObra: jest.fn() }));
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
