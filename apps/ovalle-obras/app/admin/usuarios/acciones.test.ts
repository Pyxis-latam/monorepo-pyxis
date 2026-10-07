/** @jest-environment node */
import { revalidatePath } from "next/cache";
import { exigirRol } from "@/lib/auth/sesion";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { cambiarActivo, crearUsuario } from "./acciones";

jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }));
jest.mock("@/lib/auth/sesion", () => ({ exigirRol: jest.fn() }));
jest.mock("@/lib/supabase/admin", () => ({ crearClienteAdmin: jest.fn() }));

type Llamada = { metodo: string; args: unknown[] };

/**
 * Cliente admin falso: registra la cadena `from().update().eq().select()` y las llamadas a
 * `auth.admin`, y responde con lo que se le indique.
 */
function adminFalso(
  respuestas: {
    createUser?: { error: { message: string } | null };
    perfil?: { data: { id: string }[] | null; error: unknown };
    updateUserById?: { error: { message: string } | null };
  } = {},
) {
  const llamadas: Llamada[] = [];
  const registrar = (metodo: string, args: unknown[]) => llamadas.push({ metodo, args });

  const cadena: Record<string, unknown> = {};
  for (const metodo of ["from", "update", "eq", "select"]) {
    cadena[metodo] = (...args: unknown[]) => {
      registrar(metodo, args);
      // `select` cierra la cadena: es lo que se espera (await) y devuelve el resultado.
      return metodo === "select" ? Promise.resolve(respuestas.perfil ?? { data: [{ id: "u1" }], error: null }) : cadena;
    };
  }
  const cliente = {
    ...cadena,
    auth: {
      admin: {
        createUser: async (...args: unknown[]) => {
          registrar("createUser", args);
          return respuestas.createUser ?? { error: null };
        },
        updateUserById: async (...args: unknown[]) => {
          registrar("updateUserById", args);
          return respuestas.updateUserById ?? { error: null };
        },
      },
    },
  };
  return { cliente, llamadas };
}

const fd = (datos: Record<string, string>) => {
  const f = new FormData();
  Object.entries(datos).forEach(([k, v]) => f.set(k, v));
  return f;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(exigirRol).mockResolvedValue({ id: "admin-1", nombre: "Ana", email: "ana@x.cl", rol: "admin" });
});

describe("crearUsuario", () => {
  const datos = { nombre: "  Juan Pérez ", email: " Juan@Ovalle.CL ", rol: "admin" };

  it("crea el usuario con el rol en app_metadata y el nombre en user_metadata", async () => {
    const { cliente, llamadas } = adminFalso();
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    const estado = await crearUsuario(null, fd(datos));

    expect(exigirRol).toHaveBeenCalledWith("admin");
    expect(llamadas).toEqual([
      {
        metodo: "createUser",
        args: [
          {
            email: "juan@ovalle.cl",
            email_confirm: true,
            // El rol va en app_metadata (solo el service role lo escribe): en user_metadata lo
            // ignora el trigger y el usuario quedaría como terreno en silencio.
            user_metadata: { nombre: "Juan Pérez" },
            app_metadata: { rol: "admin" },
          },
        ],
      },
    ]);
    expect(estado).toEqual({
      ok: true,
      mensaje: "Juan Pérez ya puede ingresar con un código enviado a juan@ovalle.cl.",
    });
    expect(revalidatePath).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("no pone el rol en user_metadata", async () => {
    const { cliente, llamadas } = adminFalso();
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await crearUsuario(null, fd(datos));

    const parametros = llamadas[0].args[0] as { user_metadata: Record<string, unknown> };
    expect(parametros.user_metadata).not.toHaveProperty("rol");
  });

  it("traduce 'ya registrado' a un mensaje claro", async () => {
    const { cliente } = adminFalso({
      createUser: { error: { message: "A user with this email address has already been registered" } },
    });
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await expect(crearUsuario(null, fd(datos))).resolves.toEqual({
      ok: false,
      mensaje: "Ya existe un usuario con ese email.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("devuelve un mensaje genérico ante cualquier otro error", async () => {
    const { cliente } = adminFalso({ createUser: { error: { message: "Database error creating new user" } } });
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await expect(crearUsuario(null, fd(datos))).resolves.toEqual({
      ok: false,
      mensaje: "No se pudo crear el usuario.",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("no llama a Auth si los datos no son válidos", async () => {
    const { cliente, llamadas } = adminFalso();
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await expect(crearUsuario(null, fd({ ...datos, email: "no-es-email" }))).resolves.toEqual({
      ok: false,
      mensaje: "El email no es válido.",
    });
    expect(llamadas).toEqual([]);
  });
});

describe("cambiarActivo", () => {
  it("no deja que un admin se desactive a sí mismo", async () => {
    const { cliente, llamadas } = adminFalso();
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await expect(cambiarActivo("admin-1", false)).rejects.toThrow("No puedes desactivarte a ti mismo.");
    expect(llamadas).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("desactiva: marca el perfil inactivo y banea al usuario", async () => {
    const { cliente, llamadas } = adminFalso();
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await cambiarActivo("u1", false);

    expect(exigirRol).toHaveBeenCalledWith("admin");
    expect(llamadas).toEqual([
      { metodo: "from", args: ["perfiles"] },
      { metodo: "update", args: [{ activo: false }] },
      { metodo: "eq", args: ["id", "u1"] },
      { metodo: "select", args: ["id"] },
      { metodo: "updateUserById", args: ["u1", { ban_duration: "876000h" }] },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("reactiva: marca el perfil activo y quita el baneo", async () => {
    const { cliente, llamadas } = adminFalso();
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await cambiarActivo("u1", true);

    expect(llamadas).toEqual([
      { metodo: "from", args: ["perfiles"] },
      { metodo: "update", args: [{ activo: true }] },
      { metodo: "eq", args: ["id", "u1"] },
      { metodo: "select", args: ["id"] },
      { metodo: "updateUserById", args: ["u1", { ban_duration: "none" }] },
    ]);
    expect(revalidatePath).toHaveBeenCalledWith("/admin/usuarios");
  });

  it("falla si el perfil no existe (la actualización no toca ninguna fila) y no banea", async () => {
    const { cliente, llamadas } = adminFalso({ perfil: { data: [], error: null } });
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await expect(cambiarActivo("u1", false)).rejects.toThrow("El usuario no existe.");
    expect(llamadas.map((l) => l.metodo)).not.toContain("updateUserById");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("propaga el error al actualizar el perfil y no banea", async () => {
    const { cliente, llamadas } = adminFalso({ perfil: { data: null, error: new Error("boom") } });
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await expect(cambiarActivo("u1", false)).rejects.toThrow("boom");
    expect(llamadas.map((l) => l.metodo)).not.toContain("updateUserById");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("propaga el error del baneo para que una desactivación a medias no pase inadvertida", async () => {
    const { cliente } = adminFalso({ updateUserById: { error: new Error("ban falló") } });
    jest.mocked(crearClienteAdmin).mockReturnValue(cliente as never);

    await expect(cambiarActivo("u1", false)).rejects.toThrow("ban falló");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
