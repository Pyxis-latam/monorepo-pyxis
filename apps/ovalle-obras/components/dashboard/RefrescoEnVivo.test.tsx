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

jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("@/lib/supabase/navegador", () => ({
  crearClienteNavegador: () => ({ channel: () => canal, removeChannel }),
}));

describe("RefrescoEnVivo", () => {
  beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
  afterEach(() => jest.useRealTimers());

  it("escucha solo los reportes de esta obra", () => {
    render(<RefrescoEnVivo obraId="o1" />);
    expect(canal.on).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "*", schema: "public", table: "reportes", filter: "obra_id=eq.o1" },
      expect.any(Function),
    );
  });

  it("refresca (agrupando ráfagas) cuando llega un reporte", () => {
    render(<RefrescoEnVivo obraId="o1" />);
    act(() => { alEstado("SUBSCRIBED"); alCambiar(); alCambiar(); jest.advanceTimersByTime(1000); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("avisa al perder conexión y recarga al volver", () => {
    render(<RefrescoEnVivo obraId="o1" />);
    act(() => alEstado("SUBSCRIBED"));
    expect(screen.getByText("En vivo")).toBeInTheDocument();
    act(() => alEstado("CHANNEL_ERROR"));
    expect(screen.getByText("Reconectando…")).toBeInTheDocument();
    act(() => { alEstado("SUBSCRIBED"); jest.advanceTimersByTime(1000); });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("al desmontar cancela el refresco pendiente y cierra el canal", () => {
    const { unmount } = render(<RefrescoEnVivo obraId="o1" />);
    act(() => { alEstado("SUBSCRIBED"); alCambiar(); });
    unmount();
    act(() => { jest.advanceTimersByTime(1000); });
    expect(refresh).not.toHaveBeenCalled();
    expect(removeChannel).toHaveBeenCalledWith(canal);
  });
});
