import { act, render, screen, userEvent } from "@testing-library/react-native";
import { cargarAvanceObra } from "@pyxis/ovalle-core/datos/obra";
import type { NodoAvance } from "@pyxis/ovalle-core/avance/tipos";
import Partidas from "@/app/(app)/(partidas)/obras/[id]";

const mockPush = jest.fn();
const mockStackScreen = jest.fn();
let mockParams: { id: string; enviado?: string } = { id: "o1" };

jest.mock("expo-router", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    router: { push: (...args: unknown[]) => mockPush(...args) },
    Stack: {
      Screen: (props: unknown) => {
        mockStackScreen(props);
        return null;
      },
    },
    useLocalSearchParams: () => mockParams,
    // Como en la app: corre al enfocar la pantalla (aquí, al montarla).
    useFocusEffect: (efecto: () => void) => React.useEffect(efecto, [efecto]),
  };
});
jest.mock("@/lib/supabase", () => ({ supabase: { nombre: "supabase" } }));
jest.mock("@pyxis/ovalle-core/datos/obra", () => ({ cargarAvanceObra: jest.fn() }));

const cargar = jest.mocked(cargarAvanceObra);

const nodo = (p: Partial<NodoAvance> & Pick<NodoAvance, "id" | "codigo" | "descripcion">): NodoAvance => ({
  parent_id: null,
  unidad: "kg",
  cantidad: 100,
  precio_unitario: 10,
  fecha_inicio: null,
  fecha_fin: null,
  orden: 0,
  esHoja: true,
  nivel: 1,
  ejecutado: 0,
  porcentaje: 0,
  porcentajeEsperado: null,
  montoPresupuestado: 0,
  montoEjecutado: 0,
  estado: "sin_fechas",
  hijos: [],
  ...p,
});

const enfierradura = nodo({
  id: "a",
  codigo: "1.1",
  descripcion: "Enfierradura losa P3",
  ejecutado: 30,
  porcentaje: 0.3,
  fecha_inicio: "2000-01-01",
  fecha_fin: "2999-12-31",
  estado: "al_dia",
});
const hormigon = nodo({ id: "b", codigo: "1.2", descripcion: "Hormigón losa P3", unidad: "m3", cantidad: 10 });
const pintura = nodo({
  id: "c",
  codigo: "2.1",
  descripcion: "Pintura muros",
  unidad: "m2",
  cantidad: 50,
  ejecutado: 50,
  porcentaje: 1,
  estado: "terminada",
});
const raices: NodoAvance[] = [
  nodo({ id: "k1", codigo: "1", descripcion: "Obra gruesa", esHoja: false, unidad: null, cantidad: null, hijos: [enfierradura, hormigon] }),
  nodo({ id: "k2", codigo: "2", descripcion: "Terminaciones", esHoja: false, unidad: null, cantidad: null, hijos: [pintura] }),
];
const DATOS = {
  obra: { id: "o1", nombre: "Edificio Alameda", estado: "activa" as const },
  raices,
  resumen: { porcentajeFisico: 0.3, montoPresupuestado: 0, montoEjecutado: 0 } as never,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { id: "o1" };
  cargar.mockResolvedValue(DATOS);
});

it("carga el avance de la obra con la fecha de hoy y pone su nombre en el encabezado", async () => {
  await render(<Partidas />);
  await screen.findByText("Pintura muros", { exact: false });

  expect(cargar).toHaveBeenCalledTimes(1);
  expect(cargar).toHaveBeenCalledWith({ nombre: "supabase" }, "o1", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  expect(mockStackScreen).toHaveBeenCalledWith(expect.objectContaining({ options: expect.objectContaining({ title: "Edificio Alameda" }) }));
});

it("sin búsqueda muestra 'En curso hoy' y luego cada capítulo, con la barra y el avance de cada partida", async () => {
  await render(<Partidas />);

  expect(await screen.findByText("En curso hoy")).toBeOnTheScreen();
  expect(screen.getByText("1 Obra gruesa")).toBeOnTheScreen();
  expect(screen.getByText("2 Terminaciones")).toBeOnTheScreen();
  // La partida en curso aparece arriba y también en su capítulo.
  expect(screen.getAllByText("1.1 Enfierradura losa P3")).toHaveLength(2);
  expect(screen.getAllByText("30,0% · 30/100 kg")).toHaveLength(2);
  expect(screen.getByText("1.2 Hormigón losa P3")).toBeOnTheScreen();
  expect(screen.getByText("0,0% · 0/10 m3")).toBeOnTheScreen();
  expect(screen.getByText("100,0% · 50/50 m2")).toBeOnTheScreen();
});

it("al buscar oculta las secciones y filtra sin importar tildes ni mayúsculas", async () => {
  const user = userEvent.setup();
  await render(<Partidas />);
  await screen.findByText("En curso hoy");

  await user.type(screen.getByLabelText("Buscar partida"), "HORMIGON");

  expect(screen.queryByText("En curso hoy")).not.toBeOnTheScreen();
  expect(screen.queryByText("1 Obra gruesa")).not.toBeOnTheScreen();
  expect(screen.getByText("1.2 Hormigón losa P3")).toBeOnTheScreen();
  expect(screen.queryByText("1.1 Enfierradura losa P3")).not.toBeOnTheScreen();
  expect(screen.queryByText("2.1 Pintura muros")).not.toBeOnTheScreen();
});

it("si la búsqueda no encuentra nada lo dice", async () => {
  const user = userEvent.setup();
  await render(<Partidas />);
  await screen.findByText("En curso hoy");

  await user.type(screen.getByLabelText("Buscar partida"), "zzz");

  expect(screen.getByText("No hay partidas que coincidan.")).toBeOnTheScreen();
});

it("al tocar una partida abre su formulario de reporte", async () => {
  const user = userEvent.setup();
  await render(<Partidas />);
  await screen.findByText("1.2 Hormigón losa P3");

  await user.press(screen.getByRole("button", { name: /Hormigón losa P3/ }));

  expect(mockPush).toHaveBeenCalledWith("/obras/o1/partidas/b");
});

it("con enviado=1 avisa 'Reporte enviado ✓'", async () => {
  mockParams = { id: "o1", enviado: "1" };
  await render(<Partidas />);

  expect(await screen.findByText("Reporte enviado ✓")).toBeOnTheScreen();
});

it("sin enviado no muestra el aviso", async () => {
  await render(<Partidas />);
  await screen.findByText("En curso hoy");

  expect(screen.queryByText("Reporte enviado ✓")).not.toBeOnTheScreen();
});

it("al tirar hacia abajo recarga el avance", async () => {
  await render(<Partidas />);
  await screen.findByText("En curso hoy");
  cargar.mockResolvedValueOnce({
    ...DATOS,
    raices: [nodo({ id: "k1", codigo: "1", descripcion: "Obra gruesa", esHoja: false, hijos: [{ ...hormigon, ejecutado: 5, porcentaje: 0.5 }] })],
  });

  const { refreshControl } = screen.getByTestId("lista-partidas").props;
  await act(async () => {
    await refreshControl.props.onRefresh();
  });

  expect(cargar).toHaveBeenCalledTimes(2);
  expect(await screen.findByText("50,0% · 5/10 m3")).toBeOnTheScreen();
});

it("si falla la carga ofrece reintentar", async () => {
  cargar.mockRejectedValueOnce(new Error("Network request failed"));
  const user = userEvent.setup();
  await render(<Partidas />);

  expect(await screen.findByText("No pudimos cargar las partidas. Revisa tu señal.")).toBeOnTheScreen();

  await user.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("En curso hoy")).toBeOnTheScreen();
  expect(screen.queryByText("No pudimos cargar las partidas. Revisa tu señal.")).not.toBeOnTheScreen();
});

it("si la recarga falla pero ya había datos, conserva la lista", async () => {
  await render(<Partidas />);
  await screen.findByText("En curso hoy");
  cargar.mockRejectedValueOnce(new Error("Network request failed"));

  const { refreshControl } = screen.getByTestId("lista-partidas").props;
  await act(async () => {
    await refreshControl.props.onRefresh();
  });

  expect(screen.getByText("1.2 Hormigón losa P3")).toBeOnTheScreen();
  expect(screen.getByText("No pudimos actualizar. Revisa tu señal.")).toBeOnTheScreen();
});

it("si la obra no existe (o no se puede ver) lo dice", async () => {
  cargar.mockResolvedValue(null);
  await render(<Partidas />);

  expect(await screen.findByText("No encontramos esta obra.")).toBeOnTheScreen();
});
