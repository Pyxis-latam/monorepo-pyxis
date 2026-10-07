import { act, render, screen, userEvent } from "@testing-library/react-native";
import Obras from "@/app/(app)/(partidas)/index";
import { supabase } from "@/lib/supabase";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args), push: (...args: unknown[]) => mockPush(...args) },
}));
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));

const from = supabase.from as unknown as jest.Mock;

type Resultado = { data: { id: string; nombre: string }[] | null; error: { message: string } | null };

/** Cadena de PostgREST: from("obras").select(..).eq(..).order(..) se espera al final. */
function consulta(resultado: Resultado) {
  const q = { select: jest.fn(), eq: jest.fn(), order: jest.fn(() => Promise.resolve(resultado)) };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  return q;
}

const OBRA_A = { id: "o1", nombre: "Edificio Alameda" };
const OBRA_B = { id: "o2", nombre: "Condominio Los Olivos" };
const SIN_RED = { data: null, error: { message: "TypeError: Network request failed" } };

beforeEach(() => jest.clearAllMocks());

it("pide solo las obras activas, ordenadas por nombre", async () => {
  const q = consulta({ data: [OBRA_A, OBRA_B], error: null });
  from.mockReturnValue(q);
  await render(<Obras />);

  await screen.findByText("Edificio Alameda");
  expect(from).toHaveBeenCalledWith("obras");
  expect(q.select).toHaveBeenCalledWith("id, nombre");
  expect(q.eq).toHaveBeenCalledWith("estado", "activa");
  expect(q.order).toHaveBeenCalledWith("nombre");
});

it("con varias obras las lista y abre la elegida", async () => {
  from.mockReturnValue(consulta({ data: [OBRA_A, OBRA_B], error: null }));
  const user = userEvent.setup();
  await render(<Obras />);

  expect(await screen.findByText("Condominio Los Olivos")).toBeOnTheScreen();
  expect(mockReplace).not.toHaveBeenCalled();

  await user.press(screen.getByRole("button", { name: "Condominio Los Olivos" }));
  expect(mockPush).toHaveBeenCalledWith("/obras/o2");
});

it("con una sola obra activa entra directo a ella", async () => {
  from.mockReturnValue(consulta({ data: [OBRA_A], error: null }));
  await render(<Obras />);

  await act(async () => {});
  expect(mockReplace).toHaveBeenCalledWith("/obras/o1");
  expect(mockReplace).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("No hay obras activas.")).not.toBeOnTheScreen();
});

it("sin obras activas lo dice", async () => {
  from.mockReturnValue(consulta({ data: [], error: null }));
  await render(<Obras />);

  expect(await screen.findByText("No hay obras activas.")).toBeOnTheScreen();
  expect(mockReplace).not.toHaveBeenCalled();
});

it("si no hay conexión ofrece reintentar y no dice que no hay obras", async () => {
  from.mockReturnValueOnce(consulta(SIN_RED)).mockReturnValueOnce(consulta({ data: [OBRA_A, OBRA_B], error: null }));
  const user = userEvent.setup();
  await render(<Obras />);

  expect(await screen.findByText("No pudimos cargar las obras. Revisa tu señal.")).toBeOnTheScreen();
  expect(screen.queryByText("No hay obras activas.")).not.toBeOnTheScreen();

  await user.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Edificio Alameda")).toBeOnTheScreen();
  expect(screen.queryByText("No pudimos cargar las obras. Revisa tu señal.")).not.toBeOnTheScreen();
});

it("al tirar hacia abajo vuelve a consultar", async () => {
  from.mockReturnValueOnce(consulta({ data: [OBRA_A, OBRA_B], error: null })).mockReturnValueOnce(
    consulta({ data: [OBRA_A, OBRA_B, { id: "o3", nombre: "Bodega Norte" }], error: null }),
  );
  await render(<Obras />);
  await screen.findByText("Edificio Alameda");
  expect(screen.queryByText("Bodega Norte")).not.toBeOnTheScreen();

  const { refreshControl } = screen.getByTestId("lista-obras").props;
  await act(async () => {
    await refreshControl.props.onRefresh();
  });

  expect(await screen.findByText("Bodega Norte")).toBeOnTheScreen();
  expect(from).toHaveBeenCalledTimes(2);
});
