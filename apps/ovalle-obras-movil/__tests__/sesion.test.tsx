import { act, renderHook, waitFor } from "@testing-library/react-native";
import { AppState, type AppStateStatus } from "react-native";
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

const PERFIL_ACTIVO = { id: "u1", nombre: "Juan Pérez", rol: "terreno", activo: true };
const SIN_RED = { data: null, error: { message: "TypeError: Network request failed", code: "" } };

// AppState: guardamos los listeners para simular que la app vuelve a primer plano.
let listenersAppState: ((estado: AppStateStatus) => void)[] = [];
const quitarListenerAppState = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  listenersAppState = [];
  jest.mocked(AppState.addEventListener).mockImplementation((_tipo, listener) => {
    listenersAppState.push(listener as (estado: AppStateStatus) => void);
    return { remove: quitarListenerAppState };
  });
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
  expect(result.current.errorPerfil).toBe(false);
});

it("con sesión pero sin fila de perfil queda sin acceso", async () => {
  conSesion("u1");
  conPerfil(null);

  const { result } = await montar();

  expect(result.current.perfil).toBeNull();
  expect(result.current.sinAcceso).toBe(true);
  expect(result.current.errorPerfil).toBe(false);
});

it("si la consulta del perfil falla, es un error de conexión y no 'sin acceso'", async () => {
  conSesion("u1");
  cliente.consulta.maybeSingle.mockResolvedValue(SIN_RED);

  const { result } = await montar();

  expect(result.current).toMatchObject({ perfil: null, sinAcceso: false, errorPerfil: true });
});

it("si la consulta del perfil lanza (fetch rechazado), también es error de conexión", async () => {
  conSesion("u1");
  cliente.consulta.maybeSingle.mockRejectedValue(new TypeError("Network request failed"));

  const { result } = await montar();

  expect(result.current).toMatchObject({ perfil: null, sinAcceso: false, errorPerfil: true });
});

it("reintentar() vuelve a pedir el perfil y limpia el error", async () => {
  conSesion("u1");
  cliente.consulta.maybeSingle.mockResolvedValueOnce(SIN_RED).mockResolvedValueOnce({ data: PERFIL_ACTIVO, error: null });
  const { result } = await montar();
  expect(result.current.errorPerfil).toBe(true);

  await act(async () => result.current.reintentar());

  await waitFor(() => expect(result.current.perfil).toEqual({ id: "u1", nombre: "Juan Pérez", rol: "terreno" }));
  expect(result.current).toMatchObject({ errorPerfil: false, sinAcceso: false, cargando: false });
  expect(cliente.consulta.maybeSingle).toHaveBeenCalledTimes(2);
});

it("con error de conexión reintenta solo al volver a primer plano, y luego deja de escuchar", async () => {
  conSesion("u1");
  cliente.consulta.maybeSingle.mockResolvedValueOnce(SIN_RED).mockResolvedValueOnce({ data: PERFIL_ACTIVO, error: null });
  const { result } = await montar();
  expect(result.current.errorPerfil).toBe(true);
  expect(listenersAppState).toHaveLength(1);

  await act(async () => listenersAppState[0]("background"));
  expect(cliente.consulta.maybeSingle).toHaveBeenCalledTimes(1);

  await act(async () => listenersAppState[0]("active"));

  await waitFor(() => expect(result.current.perfil).not.toBeNull());
  expect(result.current.errorPerfil).toBe(false);
  expect(quitarListenerAppState).toHaveBeenCalled();
});

it("sin error de conexión no escucha AppState", async () => {
  conSesion("u1");
  conPerfil(PERFIL_ACTIVO);

  await montar();

  expect(listenersAppState).toHaveLength(0);
});

it("al desmontarse con error de conexión quita el listener de AppState", async () => {
  conSesion("u1");
  cliente.consulta.maybeSingle.mockResolvedValue(SIN_RED);
  const { result, unmount } = await montar();
  expect(result.current.errorPerfil).toBe(true);

  await unmount();

  expect(quitarListenerAppState).toHaveBeenCalled();
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
