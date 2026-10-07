import { render, screen, userEvent } from "@testing-library/react-native";
import { Redirect } from "expo-router";
import LayoutApp from "@/app/(app)/_layout";
import { useSesion, type Sesion } from "@/lib/sesion";

jest.mock("@/lib/sesion", () => ({ useSesion: jest.fn() }));
jest.mock("expo-router", () => ({ Redirect: jest.fn(() => null) }));
jest.mock("expo-router/js-tabs", () => {
  const { Text } = jest.requireActual<typeof import("react-native")>("react-native");
  function Tabs() {
    return <Text>pestañas</Text>;
  }
  Tabs.Screen = function Screen() {
    return null;
  };
  return { Tabs };
});

const salir = jest.fn();
const reintentar = jest.fn();

function conSesion(parcial: Partial<Sesion>) {
  jest.mocked(useSesion).mockReturnValue({
    cargando: false,
    perfil: null,
    sinAcceso: false,
    errorPerfil: false,
    salir,
    reintentar,
    ...parcial,
  });
}

beforeEach(() => jest.clearAllMocks());

it("con error de conexión ofrece reintentar (y salir), no 'sin acceso'", async () => {
  conSesion({ errorPerfil: true });
  const user = userEvent.setup();
  await render(<LayoutApp />);

  expect(screen.getByText("No pudimos conectar con el servidor. Revisa tu señal.")).toBeOnTheScreen();
  expect(screen.queryByText("Tu cuenta no tiene acceso")).not.toBeOnTheScreen();

  await user.press(screen.getByRole("button", { name: "Reintentar" }));
  expect(reintentar).toHaveBeenCalledTimes(1);

  await user.press(screen.getByRole("button", { name: "Salir" }));
  expect(salir).toHaveBeenCalledTimes(1);
  expect(Redirect).not.toHaveBeenCalled();
});

it("sin perfil activo muestra 'sin acceso' sin botón de reintentar", async () => {
  conSesion({ sinAcceso: true });
  await render(<LayoutApp />);

  expect(screen.getByText("Tu cuenta no tiene acceso")).toBeOnTheScreen();
  expect(screen.queryByRole("button", { name: "Reintentar" })).not.toBeOnTheScreen();
  expect(screen.getByRole("button", { name: "Salir" })).toBeOnTheScreen();
});

it("sin sesión redirige a /ingresar", async () => {
  conSesion({});
  await render(<LayoutApp />);

  expect(jest.mocked(Redirect).mock.calls[0][0]).toEqual({ href: "/ingresar" });
});

it("con perfil muestra las pestañas", async () => {
  conSesion({ perfil: { id: "u1", nombre: "Juan Pérez", rol: "terreno" } });
  await render(<LayoutApp />);

  expect(screen.getByText("pestañas")).toBeOnTheScreen();
  expect(Redirect).not.toHaveBeenCalled();
});
