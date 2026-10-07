import { render, screen, userEvent } from "@testing-library/react-native";
import { router } from "expo-router";
import Ingresar from "@/app/ingresar";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } },
}));

jest.mock("expo-router", () => {
  const router = { replace: jest.fn() };
  return { router, useRouter: () => router };
});

const auth = supabase.auth as unknown as { signInWithOtp: jest.Mock; verifyOtp: jest.Mock };
const replace = router.replace as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
  auth.verifyOtp.mockResolvedValue({ data: {}, error: null });
});

async function pedirCodigo(user: ReturnType<typeof userEvent.setup>) {
  await render(<Ingresar />);
  await user.type(screen.getByLabelText("Email"), "  Juan@Ovalle.cl ");
  await user.press(screen.getByRole("button", { name: "Enviarme un código" }));
}

it("pide el código con el email en minúsculas y sin espacios, sin crear usuarios", async () => {
  const user = userEvent.setup();
  await pedirCodigo(user);

  expect(auth.signInWithOtp).toHaveBeenCalledWith({
    email: "juan@ovalle.cl",
    options: { shouldCreateUser: false },
  });
  expect(await screen.findByLabelText("Código")).toBeOnTheScreen();
});

it("verifica el código y entra a la app", async () => {
  const user = userEvent.setup();
  await pedirCodigo(user);

  await user.type(await screen.findByLabelText("Código"), "123456");
  await user.press(screen.getByRole("button", { name: "Ingresar" }));

  expect(auth.verifyOtp).toHaveBeenCalledWith({
    email: "juan@ovalle.cl",
    token: "123456",
    type: "email",
  });
  expect(replace).toHaveBeenCalledWith("/");
});

it("avisa si el código no sirve y no navega", async () => {
  auth.verifyOtp.mockResolvedValue({ data: {}, error: { message: "Token has expired or is invalid" } });
  const user = userEvent.setup();
  await pedirCodigo(user);

  await user.type(await screen.findByLabelText("Código"), "123456");
  await user.press(screen.getByRole("button", { name: "Ingresar" }));

  expect(await screen.findByText("El código no es válido o venció. Pide uno nuevo.")).toBeOnTheScreen();
  expect(replace).not.toHaveBeenCalled();
});

it("avisa si no se pudo enviar el código y se queda en el paso del email", async () => {
  auth.signInWithOtp.mockResolvedValue({ data: {}, error: { message: "Signups not allowed for otp" } });
  const user = userEvent.setup();
  await pedirCodigo(user);

  expect(
    await screen.findByText("No pudimos enviar el código. Revisa el email o pide acceso al administrador."),
  ).toBeOnTheScreen();
  expect(screen.queryByLabelText("Código")).not.toBeOnTheScreen();
});
