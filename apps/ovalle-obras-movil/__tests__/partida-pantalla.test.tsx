import { render, screen, userEvent } from "@testing-library/react-native";
import Reportar from "@/app/(app)/(partidas)/obras/[id]/partidas/[partidaId]";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";

const mockDismissTo = jest.fn();
const mockFormulario = jest.fn();

jest.mock("expo-router", () => ({
  router: { dismissTo: (...args: unknown[]) => mockDismissTo(...args) },
  useLocalSearchParams: () => ({ id: "o1", partidaId: "p1" }),
}));
jest.mock("@/lib/sesion", () => ({ useSesion: jest.fn() }));
jest.mock("@/lib/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/components/FormularioReporte", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    FormularioReporte: (props: { partida: { descripcion: string } }) => {
      mockFormulario(props);
      return <Text>{`formulario de ${props.partida.descripcion}`}</Text>;
    },
  };
});

const from = supabase.from as unknown as jest.Mock;

type Resultado = { data: unknown; error: { message: string } | null };

/** from(tabla).select(..).eq(..)….maybeSingle() */
function consulta(resultado: Resultado) {
  const q = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn(() => Promise.resolve(resultado)) };
  q.select.mockReturnValue(q);
  q.eq.mockReturnValue(q);
  return q;
}

function tablas(partidas: Resultado, ejecutado: Resultado) {
  const q = { partidas: consulta(partidas), partida_ejecutado: consulta(ejecutado) };
  from.mockImplementation((tabla: keyof typeof q) => q[tabla]);
  return q;
}

// numeric llega como string desde PostgREST.
const PARTIDA = { id: "p1", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: "4200.0000" };
const EJECUTADO = { ejecutado: "4000.0000" };
const OK = { data: PARTIDA, error: null };
const SIN_RED = { data: null, error: { message: "TypeError: Network request failed" } };

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSesion).mockReturnValue({
    cargando: false,
    perfil: { id: "u1", nombre: "Juan Pérez", rol: "terreno" },
    sinAcceso: false,
    errorPerfil: false,
    reintentar: jest.fn(),
    salir: jest.fn(),
  });
});

it("carga la partida de la obra y su ejecutado y arma el formulario con el usuario como autor", async () => {
  const q = tablas(OK, { data: EJECUTADO, error: null });
  await render(<Reportar />);

  expect(await screen.findByText("formulario de Enfierradura losa P3")).toBeOnTheScreen();
  expect(q.partidas.select).toHaveBeenCalledWith("id, codigo, descripcion, unidad, cantidad");
  expect(q.partidas.eq).toHaveBeenCalledWith("id", "p1");
  expect(q.partidas.eq).toHaveBeenCalledWith("obra_id", "o1");
  expect(q.partida_ejecutado.eq).toHaveBeenCalledWith("partida_id", "p1");
  expect(mockFormulario.mock.calls[0][0]).toMatchObject({
    obraId: "o1",
    autorId: "u1",
    partida: { id: "p1", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 4200, ejecutado: 4000 },
  });
});

it("una partida sin reportes aún tiene ejecutado 0", async () => {
  tablas(OK, { data: null, error: null });
  await render(<Reportar />);

  await screen.findByText("formulario de Enfierradura losa P3");
  expect(mockFormulario.mock.calls[0][0].partida.ejecutado).toBe(0);
});

it("al enviar vuelve a la lista de la obra con el aviso de enviado", async () => {
  tablas(OK, { data: EJECUTADO, error: null });
  await render(<Reportar />);
  await screen.findByText("formulario de Enfierradura losa P3");

  mockFormulario.mock.calls[0][0].alEnviar();

  expect(mockDismissTo).toHaveBeenCalledWith("/obras/o1?enviado=1");
});

it("si no se puede leer lo ejecutado no muestra el formulario (no es lo mismo que 0)", async () => {
  tablas(OK, SIN_RED);
  const user = userEvent.setup();
  await render(<Reportar />);

  expect(await screen.findByText("No pudimos cargar la partida. Revisa tu señal.")).toBeOnTheScreen();
  expect(mockFormulario).not.toHaveBeenCalled();

  tablas(OK, { data: EJECUTADO, error: null });
  await user.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("formulario de Enfierradura losa P3")).toBeOnTheScreen();
});

it("si la partida no existe en esa obra lo dice", async () => {
  tablas({ data: null, error: null }, { data: null, error: null });
  await render(<Reportar />);

  expect(await screen.findByText("No encontramos esta partida.")).toBeOnTheScreen();
  expect(mockFormulario).not.toHaveBeenCalled();
});

it("una partida sin unidad o sin cantidad presupuestada no se puede reportar", async () => {
  tablas({ data: { ...PARTIDA, unidad: null }, error: null }, { data: null, error: null });
  await render(<Reportar />);

  expect(await screen.findByText("Esta partida no tiene unidad o cantidad presupuestada, no se puede reportar avance.")).toBeOnTheScreen();
  expect(mockFormulario).not.toHaveBeenCalled();
});
