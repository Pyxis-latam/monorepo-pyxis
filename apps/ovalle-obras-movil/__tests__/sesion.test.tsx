import { act, renderHook, waitFor } from "@testing-library/react-native";
import { SesionProvider, useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";

jest.mock("@/lib/supabase", () => {
  const consulta = { select: jest.fn(), eq: jest.fn(), maybeSingle: jest.fn() };
  consulta.select.mockReturnValue(consulta);
  consulta.eq.mockReturnValue(consulta);
  return {
    supabase: {
      auth: { getSession: jest.fn(), onAuthStateChange: jest.fn(), signOut: jest.fn() },
      from: jest.fn(() => consulta),
      consulta,
    },
  };
});

type ClienteMock = {
  auth: { getSession: jest.Mock; onAuthStateChange: jest.Mock; signOut: jest.Mock };
  from: jest.Mock;
  consulta: { select: jest.Mock; eq: jest.Mock; maybeSingle: jest.Mock };
};
const cliente = supabase as unknown as ClienteMock;

type CambioDeSesion = (evento: string, sesion: { user: { id: string } } | null) => void;
let cambioDeSesion: CambioDeSesion;
const unsubscribe = jest.fn();

function conSesion(userId: string | null) {
  cliente.auth.getSession.mockResolvedValue({
    data: { session: userId ? { user: { id: userId } } : null },
    error: null,
  });
}

function conPerfil(perfil: { id: string; nombre: string; rol: string; activo: boolean } | null) {
  cliente.consulta.maybeSingle.mockResolvedValue({ data: perfil, error: null });
}

beforeEach(() => {
  jest.clearAllMocks();
  cliente.auth.onAuthStateChange.mockImplementation((callback: CambioDeSesion) => {
    cambioDeSesion = callback;
    return { data: { subscription: { unsubscribe } } };
  });
  cliente.auth.signOut.mockResolvedValue({ error: null });
});

async function montar() {
  const hook = await renderHook(() => useSesion(), { wrapper: SesionProvider });
  await waitFor(() => expect(hook.result.current.cargando).toBe(false));
  return hook;
}

it("con sesión y perfil activo entrega el perfil", async () => {
  conSesion("u1");
  conPerfil({ id: "u1", nombre: "Juan Pérez", rol: "terreno", activo: true });

  const { result } = await montar();

  expect(result.current.perfil).toEqual({ id: "u1", nombre: "Juan Pérez", rol: "terreno" });
  expect(result.current.sinAcceso).toBe(false);
  expect(cliente.from).toHaveBeenCalledWith("perfiles");
  expect(cliente.consulta.select).toHaveBeenCalledWith("id, nombre, rol, activo");
  expect(cliente.consulta.eq).toHaveBeenCalledWith("id", "u1");
});

it("con sesión pero perfil inactivo queda sin acceso", async () => {
  conSesion("u1");
  conPerfil({ id: "u1", nombre: "Juan Pérez", rol: "terreno", activo: false });

  const { result } = await montar();

  expect(result.current.perfil).toBeNull();
  expect(result.current.sinAcceso).toBe(true);
});

it("con sesión pero sin fila de perfil queda sin acceso", async () => {
  conSesion("u1");
  conPerfil(null);

  const { result } = await montar();

  expect(result.current.perfil).toBeNull();
  expect(result.current.sinAcceso).toBe(true);
});

it("sin sesión no hay perfil ni aviso de acceso", async () => {
  conSesion(null);

  const { result } = await montar();

  expect(result.current.perfil).toBeNull();
  expect(result.current.sinAcceso).toBe(false);
  expect(cliente.from).not.toHaveBeenCalled();
});

it("al cerrar sesión (evento de Auth) se borra el perfil", async () => {
  conSesion("u1");
  conPerfil({ id: "u1", nombre: "Juan Pérez", rol: "admin", activo: true });
  const { result } = await montar();
  expect(result.current.perfil).not.toBeNull();

  await act(async () => cambioDeSesion("SIGNED_OUT", null));

  await waitFor(() => expect(result.current.perfil).toBeNull());
  expect(result.current.sinAcceso).toBe(false);
});

it("al ingresar nunca muestra 'sin sesión' mientras carga el perfil (evita volver a /ingresar)", async () => {
  conSesion(null);
  const renders: { cargando: boolean; perfil: unknown; sinAcceso: boolean }[] = [];
  const { result } = await renderHook(
    () => {
      const sesion = useSesion();
      renders.push(sesion);
      return sesion;
    },
    { wrapper: SesionProvider },
  );
  await waitFor(() => expect(result.current.cargando).toBe(false));

  let entregarPerfil: (respuesta: unknown) => void = () => {};
  cliente.consulta.maybeSingle.mockReturnValue(new Promise((resolver) => (entregarPerfil = resolver)));
  const desde = renders.length;
  await act(async () => cambioDeSesion("SIGNED_IN", { user: { id: "u1" } }));

  expect(result.current).toMatchObject({ cargando: true, perfil: null, sinAcceso: false });
  await act(async () =>
    entregarPerfil({ data: { id: "u1", nombre: "Juan Pérez", rol: "terreno", activo: true }, error: null }),
  );

  expect(result.current.perfil).toEqual({ id: "u1", nombre: "Juan Pérez", rol: "terreno" });
  const sinSesion = renders.slice(desde).filter((r) => !r.cargando && !r.perfil && !r.sinAcceso);
  expect(sinSesion).toEqual([]);
});

it("salir() cierra la sesión en Supabase", async () => {
  conSesion("u1");
  conPerfil({ id: "u1", nombre: "Juan Pérez", rol: "terreno", activo: true });
  const { result } = await montar();

  await act(() => result.current.salir());

  expect(cliente.auth.signOut).toHaveBeenCalled();
});

it("deja de escuchar Auth al desmontarse", async () => {
  conSesion(null);
  const { unmount } = await montar();

  await unmount();

  expect(unsubscribe).toHaveBeenCalled();
});
