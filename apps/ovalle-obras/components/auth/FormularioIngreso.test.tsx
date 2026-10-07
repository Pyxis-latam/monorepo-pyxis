import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormularioIngreso } from "./FormularioIngreso";

const signInWithOtp = jest.fn();
const verifyOtp = jest.fn();
const replace = jest.fn();

jest.mock("@/lib/supabase/navegador", () => ({
  crearClienteNavegador: () => ({ auth: { signInWithOtp, verifyOtp } }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace, refresh: jest.fn() }),
}));

describe("FormularioIngreso", () => {
  beforeEach(() => jest.clearAllMocks());

  it("pide el código sin crear usuarios y luego lo verifica", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({ error: null });
    render(<FormularioIngreso siguiente="/terreno" />);

    await userEvent.type(screen.getByLabelText("Email"), "juan@ovalle.cl");
    await userEvent.click(screen.getByRole("button", { name: "Enviarme un código" }));
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: "juan@ovalle.cl",
      options: { shouldCreateUser: false },
    });

    await userEvent.type(await screen.findByLabelText("Código"), "123456");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(verifyOtp).toHaveBeenCalledWith({ email: "juan@ovalle.cl", token: "123456", type: "email" });
    expect(replace).toHaveBeenCalledWith("/terreno");
  });

  it("muestra un error claro si el código no sirve", async () => {
    signInWithOtp.mockResolvedValue({ error: null });
    verifyOtp.mockResolvedValue({ error: { message: "Token has expired or is invalid" } });
    render(<FormularioIngreso siguiente="/" />);
    await userEvent.type(screen.getByLabelText("Email"), "juan@ovalle.cl");
    await userEvent.click(screen.getByRole("button", { name: "Enviarme un código" }));
    await userEvent.type(await screen.findByLabelText("Código"), "000000");
    await userEvent.click(screen.getByRole("button", { name: "Ingresar" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("El código no es válido o venció");
    expect(replace).not.toHaveBeenCalled();
  });
});
