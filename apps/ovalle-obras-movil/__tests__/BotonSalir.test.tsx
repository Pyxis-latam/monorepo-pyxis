import { render, screen, userEvent } from "@testing-library/react-native";
import { Alert, StyleSheet, type AlertButton } from "react-native";
import { BotonSalir } from "@/components/BotonSalir";
import { useSesion } from "@/lib/sesion";

jest.mock("@/lib/sesion", () => ({ useSesion: jest.fn() }));

const salir = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useSesion).mockReturnValue({
    cargando: false,
    perfil: { id: "u1", nombre: "Juan Pérez", rol: "terreno" },
    sinAcceso: false,
    errorPerfil: false,
    reintentar: jest.fn(),
    salir,
  });
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
});

it("pide confirmar antes de cerrar la sesión", async () => {
  const user = userEvent.setup();
  await render(<BotonSalir />);

  await user.press(screen.getByRole("button", { name: "Salir" }));

  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(salir).not.toHaveBeenCalled();
});

it("cierra la sesión solo al confirmar", async () => {
  const user = userEvent.setup();
  await render(<BotonSalir />);
  await user.press(screen.getByRole("button", { name: "Salir" }));

  const botones = jest.mocked(Alert.alert).mock.calls[0][2] as AlertButton[];
  const cancelar = botones.find((b) => b.style === "cancel");
  const confirmar = botones.find((b) => b.text === "Salir");

  cancelar?.onPress?.();
  expect(salir).not.toHaveBeenCalled();

  confirmar?.onPress?.();
  expect(salir).toHaveBeenCalledTimes(1);
});

it("el botón mide al menos 48 de alto", async () => {
  await render(<BotonSalir />);

  const { style } = screen.getByRole("button", { name: "Salir" }).props;
  expect(StyleSheet.flatten(style).minHeight).toBeGreaterThanOrEqual(48);
});
