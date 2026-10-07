import { act, render, screen } from "@testing-library/react";
import { RefrescoEnVivo } from "./RefrescoEnVivo";

const refresh = jest.fn();
let alCambiar: () => void = () => {};
let alEstado: (s: string) => void = () => {};
const canal = {
  on: jest.fn((_t: string, _f: unknown, cb: () => void) => { alCambiar = cb; return canal; }),
  subscribe: jest.fn((cb: (s: string) => void) => { alEstado = cb; return canal; }),
};
const removeChannel = jest.fn();
// Resuelve cuando el cliente ya leyó la sesión y dejó su token en Realtime.
let sesionLista: () => void = () => {};
const setAuth = jest.fn(() => new Promise<void>((resolver) => { sesionLista = resolver; }));

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("@/lib/supabase/navegador", () => ({
  crearClienteNavegador: () => ({ channel: () => canal, removeChannel, realtime: { setAuth } }),
}));

async function montar() {
  const montado = render(<RefrescoEnVivo obraId="o1" />);
  await act(async () => sesionLista());
  return montado;
}

describe("RefrescoEnVivo", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => jest.useRealTimers());

  it("escucha solo los reportes de esta obra", async () => {
    await montar();
    expect(canal.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "reportes", filter: "obra_id=eq.o1" },
      expect.any(Function),
    );
  });

  it("no abre el canal hasta que Realtime tiene el token de la sesión", async () => {
    // Sin token el canal entra como anónimo y RLS no le entrega ningún reporte.
    render(<RefrescoEnVivo obraId="o1" />);
    expect(setAuth).toHaveBeenCalledTimes(1);
    expect(canal.subscribe).not.toHaveBeenCalled();
    await act(async () => sesionLista());
    expect(canal.subscribe).toHaveBeenCalledTimes(1);
  });

  it("si se desmonta antes de tener la sesión, no abre el canal", async () => {
    const { unmount } = render(<RefrescoEnVivo obraId="o1" />);
    unmount();
    await act(async () => sesionLista());
    expect(canal.subscribe).not.toHaveBeenCalled();
    expect(removeChannel).not.toHaveBeenCalled();
  });

  it("refresca (agrupando ráfagas) cuando llega un reporte", async () => {
    await montar();
    act(() => { alEstado("SUBSCRIBED"); alCambiar(); alCambiar(); jest.advanceTimersByTime(1000); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("avisa al perder conexión y recarga al volver", async () => {
    await montar();
    act(() => alEstado("SUBSCRIBED"));
    expect(screen.getByText("En vivo")).toBeInTheDocument();
    act(() => alEstado("CHANNEL_ERROR"));
    expect(screen.getByText("Reconectando…")).toBeInTheDocument();
    act(() => { alEstado("SUBSCRIBED"); jest.advanceTimersByTime(1000); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("al desmontar cancela el refresco pendiente y cierra el canal", async () => {
    const { unmount } = await montar();
    act(() => { alEstado("SUBSCRIBED"); alCambiar(); });
    unmount();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(refresh).not.toHaveBeenCalled();
    expect(removeChannel).toHaveBeenCalledWith(canal);
  });
});
