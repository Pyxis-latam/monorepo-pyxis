import { act, render, screen, userEvent } from "@testing-library/react-native";
import { cargarFeed, type ReporteFeed } from "@pyxis/ovalle-core/datos/feed";
import Reportes from "@/app/(app)/reportes";

// Como en la app, `useFocusEffect` corre al enfocar la pantalla (aquí, al montarla). Se guarda el
// callback para simular que la pestaña vuelve a enfocarse.
let mockAlEnfocar: () => void = () => {};

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    useFocusEffect: (efecto: () => void) => {
      mockAlEnfocar = efecto;
      React.useEffect(efecto, [efecto]);
    },
  };
});
jest.mock("@/lib/supabase", () => ({ supabase: { nombre: "supabase" } }));
jest.mock("@/lib/sesion", () => ({
  useSesion: () => ({ perfil: { id: "u1", nombre: "Juan Pérez", rol: "terreno" } }),
}));
jest.mock("@pyxis/ovalle-core/datos/feed", () => ({ cargarFeed: jest.fn() }));

const feed = jest.mocked(cargarFeed);

const reporte = (parcial: Partial<ReporteFeed> = {}): ReporteFeed => ({
  id: "r1",
  cantidad: 20,
  comentario: "Sector norte",
  creado_en: "2026-11-05T14:32:00Z",
  anulado: false,
  fotoUrl: "https://x/f.jpg",
  fotoPath: "o1/u1/r1.jpg",
  partida: { codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg" },
  autor: "Juan Pérez",
  ...parcial,
});
const REPORTE = reporte();
const ANULADO = reporte({
  id: "r2",
  cantidad: 5,
  comentario: null,
  creado_en: "2026-11-06T09:05:00Z",
  anulado: true,
  fotoUrl: null,
  fotoPath: null,
  partida: { codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3" },
});
const ERROR_CARGA = "No pudimos cargar tus reportes. Revisa tu señal.";

beforeEach(() => {
  jest.clearAllMocks();
  feed.mockResolvedValue([REPORTE, ANULADO]);
});

it("pide los últimos 30 reportes del usuario", async () => {
  await render(<Reportes />);
  await screen.findByText("Sector norte");

  expect(feed).toHaveBeenCalledTimes(1);
  expect(feed).toHaveBeenCalledWith({ nombre: "supabase" }, { autorId: "u1" }, 30);
});

it("muestra cantidad, partida, comentario, hora de Chile y foto de cada reporte", async () => {
  await render(<Reportes />);

  expect(await screen.findByText("20 kg · 1.1 Enfierradura losa P3")).toBeOnTheScreen();
  expect(screen.getByText("Sector norte")).toBeOnTheScreen();
  // 14:32 UTC es 11:32 en Chile (horario de verano).
  expect(screen.getByText("05-11-2026 11:32")).toBeOnTheScreen();
  const fotos = screen.getAllByLabelText("Foto del reporte");
  expect(fotos).toHaveLength(1);
  expect(fotos[0].props.source).toEqual({ uri: "https://x/f.jpg" });
  expect(screen.getByText("5 m3 · 1.2 Hormigón losa P3")).toBeOnTheScreen();
  expect(screen.getByText("06-11-2026 06:05")).toBeOnTheScreen();
});

it("marca como anulado solo el reporte anulado", async () => {
  await render(<Reportes />);
  await screen.findByText("20 kg · 1.1 Enfierradura losa P3");

  expect(screen.getAllByText("Anulado")).toHaveLength(1);
});

it("si la partida no tiene unidad no deja un espacio de más", async () => {
  feed.mockResolvedValue([reporte({ cantidad: 1.5, partida: { codigo: "3", descripcion: "Aseo", unidad: null } })]);
  await render(<Reportes />);

  expect(await screen.findByText("1,5 · 3 Aseo")).toBeOnTheScreen();
});

it("sin reportes lo dice", async () => {
  feed.mockResolvedValue([]);
  await render(<Reportes />);

  expect(await screen.findByText("Todavía no has enviado reportes.")).toBeOnTheScreen();
  expect(screen.queryByText(ERROR_CARGA)).not.toBeOnTheScreen();
});

it("si no hay conexión avisa, no dice que no hay reportes y deja reintentar", async () => {
  feed.mockRejectedValueOnce(new Error("Network request failed")).mockResolvedValueOnce([REPORTE]);
  const user = userEvent.setup();
  await render(<Reportes />);

  expect(await screen.findByText(ERROR_CARGA)).toBeOnTheScreen();
  expect(screen.queryByText("Todavía no has enviado reportes.")).not.toBeOnTheScreen();

  await user.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("20 kg · 1.1 Enfierradura losa P3")).toBeOnTheScreen();
  expect(screen.queryByText(ERROR_CARGA)).not.toBeOnTheScreen();
});

it("al tirar hacia abajo vuelve a pedir los reportes", async () => {
  feed.mockResolvedValueOnce([ANULADO]).mockResolvedValueOnce([REPORTE, ANULADO]);
  await render(<Reportes />);
  await screen.findByText("5 m3 · 1.2 Hormigón losa P3");
  expect(screen.queryByText("20 kg · 1.1 Enfierradura losa P3")).not.toBeOnTheScreen();

  const { refreshControl } = screen.getByTestId("lista-reportes").props;
  await act(async () => {
    await refreshControl.props.onRefresh();
  });

  expect(await screen.findByText("20 kg · 1.1 Enfierradura losa P3")).toBeOnTheScreen();
  expect(feed).toHaveBeenCalledTimes(2);
});

it("al volver a enfocar la pestaña refresca la lista (las URL de las fotos vencen a la hora)", async () => {
  feed
    .mockResolvedValueOnce([reporte({ fotoUrl: "https://x/vieja.jpg" })])
    .mockResolvedValueOnce([reporte({ fotoUrl: "https://x/nueva.jpg" })]);
  await render(<Reportes />);
  await screen.findByText("Sector norte");
  expect(screen.getByLabelText("Foto del reporte").props.source).toEqual({ uri: "https://x/vieja.jpg" });

  await act(async () => {
    mockAlEnfocar();
  });

  expect(feed).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText("Foto del reporte").props.source).toEqual({ uri: "https://x/nueva.jpg" });
});

it("si falla al refrescar avisa y conserva la lista anterior", async () => {
  feed.mockResolvedValueOnce([REPORTE]).mockRejectedValueOnce(new Error("Network request failed"));
  await render(<Reportes />);
  await screen.findByText("20 kg · 1.1 Enfierradura losa P3");
  expect(screen.queryByText(ERROR_CARGA)).not.toBeOnTheScreen();

  await act(async () => {
    mockAlEnfocar();
  });

  expect(screen.getByText(ERROR_CARGA)).toBeOnTheScreen();
  expect(screen.getByText("20 kg · 1.1 Enfierradura losa P3")).toBeOnTheScreen();
  expect(screen.queryByText("Todavía no has enviado reportes.")).not.toBeOnTheScreen();
});

it("un refresco que funciona después de un fallo quita el aviso", async () => {
  feed
    .mockResolvedValueOnce([REPORTE])
    .mockRejectedValueOnce(new Error("Network request failed"))
    .mockResolvedValueOnce([REPORTE]);
  await render(<Reportes />);
  await screen.findByText("20 kg · 1.1 Enfierradura losa P3");

  await act(async () => {
    mockAlEnfocar();
  });
  expect(screen.getByText(ERROR_CARGA)).toBeOnTheScreen();

  await act(async () => {
    mockAlEnfocar();
  });
  expect(screen.queryByText(ERROR_CARGA)).not.toBeOnTheScreen();
});
