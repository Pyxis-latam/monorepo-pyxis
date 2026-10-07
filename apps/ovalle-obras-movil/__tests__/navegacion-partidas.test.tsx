import { router, useLocalSearchParams } from "expo-router";
import { userEvent } from "@testing-library/react-native";
import { act, renderRouter, screen } from "expo-router/testing-library";
import { Pressable, Text } from "react-native";
import LayoutPartidas from "@/app/(app)/(partidas)/_layout";

// Pantallas de mentira con las mismas rutas que la app: aquí se prueba la pila real (el layout de verdad).
jest.mock("@/lib/sesion", () => ({ useSesion: () => ({ salir: jest.fn() }) }));

function Obra() {
  const { id, enviado } = useLocalSearchParams<{ id: string; enviado?: string }>();
  return <Text>{`obra ${id} enviado=${enviado ?? "no"}`}</Text>;
}

function Reporte() {
  const { id, partidaId } = useLocalSearchParams<{ id: string; partidaId: string }>();
  return (
    <Pressable accessibilityRole="button" onPress={() => router.dismissTo(`/obras/${id}?enviado=1`)}>
      <Text>{`reportar ${partidaId}`}</Text>
    </Pressable>
  );
}

async function abrirApp() {
  await renderRouter(
    {
      "(partidas)/_layout": LayoutPartidas,
      "(partidas)/index": () => <Text>lista de obras</Text>,
      "(partidas)/obras/[id]": Obra,
      "(partidas)/obras/[id]/partidas/[partidaId]": Reporte,
    },
    { initialUrl: "/" },
  );
}

it("tras enviar un reporte vuelve a la obra que estaba en la pila, con el aviso, y atrás sigue yendo a la lista", async () => {
  const user = userEvent.setup();
  await abrirApp();
  expect(screen.getByText("lista de obras")).toBeOnTheScreen();

  await act(async () => router.push("/obras/o1"));
  await act(async () => router.push("/obras/o1/partidas/p1"));
  await user.press(screen.getByRole("button", { name: "reportar p1" }));

  expect(await screen.findByText("obra o1 enviado=1")).toBeOnTheScreen();
  expect(screen.queryByText("reportar p1")).not.toBeOnTheScreen();

  await act(async () => router.back());
  expect(screen.getByText("lista de obras")).toBeOnTheScreen();
});

it("con una sola obra, entrar a ella reemplaza la lista: no hay a dónde volver", async () => {
  await abrirApp();

  await act(async () => router.replace("/obras/o1"));

  expect(screen.getByText("obra o1 enviado=no")).toBeOnTheScreen();
  expect(router.canGoBack()).toBe(false);
});
