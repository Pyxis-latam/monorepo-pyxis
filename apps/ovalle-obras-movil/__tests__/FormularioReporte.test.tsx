import { act, render, screen, userEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import { clienteReportesDesde } from "@pyxis/ovalle-core/reportes/enviar";
import { FormularioReporte } from "@/components/FormularioReporte";
import { supabase } from "@/lib/supabase";

const mockEnviarReporte = jest.fn();
const mockPrepararFoto = jest.fn();
const mockLanzarCamara = jest.fn();
const mockLanzarGaleria = jest.fn();
const mockPedirPermisoCamara = jest.fn();
let mockContadorId = 0;

jest.mock("@pyxis/ovalle-core/reportes/enviar", () => ({
  enviarReporte: (...args: unknown[]) => mockEnviarReporte(...args),
  clienteReportesDesde: jest.fn(() => ({ cliente: "reportes" })),
}));
jest.mock("@/lib/supabase", () => ({ supabase: { nombre: "supabase" } }));
jest.mock("@/lib/fotos", () => ({
  prepararFotoMovil: (...args: unknown[]) => mockPrepararFoto(...args),
}));
jest.mock("expo-image-picker", () => ({
  launchCameraAsync: (...args: unknown[]) => mockLanzarCamara(...args),
  launchImageLibraryAsync: (...args: unknown[]) => mockLanzarGaleria(...args),
  requestCameraPermissionsAsync: (...args: unknown[]) => mockPedirPermisoCamara(...args),
}));
// Ids distintos y predecibles: el formulario debe crear uno solo por reporte.
jest.mock("expo-crypto", () => ({ randomUUID: () => `id-${++mockContadorId}` }));

const partida = { id: "p1", codigo: "1.1", descripcion: "Enfierradura losa P3", unidad: "kg", cantidad: 4200, ejecutado: 4000 };

const FALLO_FOTO = {
  ok: false,
  mensaje: "No se pudo subir la foto. Revisa la conexión y reintenta.",
  fotoSubida: false,
  insertIntentado: false,
};
const FALLO_INSERT = {
  ok: false,
  mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.",
  fotoSubida: true,
  insertIntentado: true,
};

const NOTA_FIJO = "Este reporte ya se intentó enviar. Reintenta tal cual; si necesitas corregirlo, revisa Mis reportes después.";

const BYTES_A = new Uint8Array([1, 1, 1]).buffer;
const BYTES_B = new Uint8Array([2, 2, 2]).buffer;
const foto = (uri: string) => ({ canceled: false, assets: [{ uri, width: 4032, height: 3024 }] });

type Usuario = ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  jest.clearAllMocks();
  mockContadorId = 0;
  mockEnviarReporte.mockReset();
  mockPrepararFoto.mockImplementation(async (uri: string) => (uri.endsWith("a.jpg") ? BYTES_A : BYTES_B));
  mockPedirPermisoCamara.mockResolvedValue({ granted: true });
  mockLanzarCamara.mockResolvedValue({ canceled: true, assets: null });
  mockLanzarGaleria.mockResolvedValue({ canceled: true, assets: null });
});

async function abrir() {
  const alEnviar = jest.fn();
  const user = userEvent.setup();
  await render(<FormularioReporte obraId="o1" autorId="u1" partida={partida} alEnviar={alEnviar} />);
  return { alEnviar, user };
}

const campoCantidad = () => screen.getByLabelText("Avance de este reporte (kg)");
const campoComentario = () => screen.getByLabelText("Comentario (opcional)");

async function escribirCantidad(user: Usuario, texto: string) {
  await user.type(campoCantidad(), texto);
}

async function elegirDeGaleria(user: Usuario, uri: string) {
  mockLanzarGaleria.mockResolvedValueOnce(foto(uri));
  await user.press(screen.getByRole("button", { name: "Elegir de la galería" }));
  await screen.findByLabelText("Foto adjunta");
}

const enviar = (user: Usuario) => user.press(screen.getByRole("button", { name: "Enviar reporte" }));
const reintentar = (user: Usuario) => user.press(screen.getByRole("button", { name: "Reintentar" }));

/** Un selector que queda abierto hasta que la prueba lo resuelva. */
function selectorPendiente<T>() {
  let resolver: (valor: T) => void = () => {};
  const promesa = new Promise<T>((resolve) => (resolver = resolve));
  return { promesa, resolver: (valor: T) => act(async () => resolver(valor)) };
}

type Fibra = { memoizedProps: Record<string, unknown> | null; return: Fibra | null };
/**
 * `onPress` del Pressable que contiene el elemento, aunque esté deshabilitado (los eventos de la
 * librería lo respetan). Simula un toque que se cuela antes de que el botón quede deshabilitado.
 */
function onPressDe(elemento: { unstable_fiber: unknown }): () => Promise<void> {
  let fibra = elemento.unstable_fiber as Fibra | null;
  while (fibra && typeof fibra.memoizedProps?.onPress !== "function") fibra = fibra.return;
  if (!fibra) throw new Error("El elemento no está dentro de un Pressable");
  return fibra.memoizedProps!.onPress as () => Promise<void>;
}

describe("cantidad", () => {
  it("muestra cuánto lleva la partida, en cuánto quedaría con este reporte y avisa si se pasa de lo presupuestado", async () => {
    const { user } = await abrir();

    expect(screen.getByText("Llevas 4.000 de 4.200 kg (95,2%)")).toBeOnTheScreen();
    // Los reportes se suman: el campo es el avance de este reporte, no el total acumulado.
    expect(screen.getByText("Avance de este reporte (kg)")).toBeOnTheScreen();
    expect(screen.queryByText(/quedaría en/)).not.toBeOnTheScreen();
    expect(screen.queryByText(/se supera lo presupuestado/)).not.toBeOnTheScreen();

    await escribirCantidad(user, "300");
    expect(screen.getByText("Con este reporte quedaría en 102,4%")).toBeOnTheScreen();
    expect(screen.getByText("Con este reporte se supera lo presupuestado. Puedes enviarlo igual.")).toBeOnTheScreen();
  });

  it("no dice en cuánto quedaría si la cantidad no es válida", async () => {
    const { user } = await abrir();

    await escribirCantidad(user, "0");
    expect(screen.queryByText(/quedaría en/)).not.toBeOnTheScreen();
  });

  it("usa teclado decimal y limita el comentario a 1000 caracteres", async () => {
    await abrir();

    expect(campoCantidad().props.keyboardType).toBe("decimal-pad");
    expect(campoComentario().props.maxLength).toBe(1000);
    expect(campoComentario().props.multiline).toBe(true);
  });

  it("en modo % convierte a la unidad", async () => {
    mockEnviarReporte.mockResolvedValue({ ok: true });
    const { user } = await abrir();

    await user.press(screen.getByRole("button", { name: "%" }));
    expect(screen.getByText("Avance de este reporte (%)")).toBeOnTheScreen();
    await user.type(screen.getByLabelText("Avance de este reporte (%)"), "1");
    expect(screen.getByText("= 42 kg")).toBeOnTheScreen();
    expect(screen.getByText("Con este reporte quedaría en 96,2%")).toBeOnTheScreen();

    await enviar(user);
    expect(mockEnviarReporte.mock.calls[0][1].cantidad).toBe(42);
  });

  it("no envía cantidades inválidas", async () => {
    const { user } = await abrir();

    await escribirCantidad(user, "0");
    await enviar(user);

    expect(screen.getByRole("alert")).toHaveTextContent("Ingresa una cantidad mayor que 0.");
    expect(mockEnviarReporte).not.toHaveBeenCalled();
  });
});

describe("envío", () => {
  it("manda el reporte con los datos del formulario y el cliente de Supabase", async () => {
    mockEnviarReporte.mockResolvedValue({ ok: true });
    const { user, alEnviar } = await abrir();

    await escribirCantidad(user, "12,5");
    await user.type(campoComentario(), "Sector norte");
    await enviar(user);

    expect(clienteReportesDesde).toHaveBeenCalledWith(supabase);
    const [cliente, datos, fotoYaSubida] = mockEnviarReporte.mock.calls[0];
    expect(cliente).toEqual({ cliente: "reportes" });
    expect(datos).toEqual({
      id: "id-1",
      obraId: "o1",
      partidaId: "p1",
      autorId: "u1",
      cantidad: 12.5,
      comentario: "Sector norte",
      foto: null,
    });
    expect(fotoYaSubida).toBe(false);
    expect(alEnviar).toHaveBeenCalledTimes(1);
  });

  it("si falla, muestra el mensaje, conserva lo escrito y reintenta con el mismo id y fotoYaSubida", async () => {
    mockEnviarReporte
      .mockResolvedValueOnce({ ok: false, mensaje: "No se pudo enviar el reporte. Revisa la conexión y reintenta.", fotoSubida: true })
      .mockResolvedValueOnce({ ok: true });
    const { user, alEnviar } = await abrir();

    await escribirCantidad(user, "12,5");
    await user.type(campoComentario(), "Sector norte");
    await enviar(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudo enviar el reporte/);
    expect(alEnviar).not.toHaveBeenCalled();
    expect(campoComentario().props.value).toBe("Sector norte");
    expect(campoCantidad().props.value).toBe("12,5");

    await reintentar(user);

    const [, primero, fotoYaSubida1] = mockEnviarReporte.mock.calls[0];
    const [, segundo, fotoYaSubida2] = mockEnviarReporte.mock.calls[1];
    expect(primero.cantidad).toBe(12.5);
    expect(segundo.id).toBe(primero.id);
    expect([fotoYaSubida1, fotoYaSubida2]).toEqual([false, true]);
    expect(alEnviar).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();
  });

  it("deshabilita todos los campos mientras envía", async () => {
    let terminar: (resultado: unknown) => void = () => {};
    mockEnviarReporte.mockReturnValue(new Promise((resolve) => (terminar = resolve)));
    const { user, alEnviar } = await abrir();

    await escribirCantidad(user, "5");
    await elegirDeGaleria(user, "file:///a.jpg");
    expect(campoCantidad()).toBeEnabled();
    expect(screen.getByRole("button", { name: "Tomar foto" })).toBeEnabled();

    await enviar(user);

    expect(await screen.findByRole("button", { name: "Enviando…" })).toBeDisabled();
    expect(campoCantidad()).toBeDisabled();
    expect(campoComentario()).toBeDisabled();
    expect(screen.getByRole("button", { name: "kg" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "%" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tomar foto" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Elegir de la galería" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quitar foto" })).toBeDisabled();

    await act(async () => terminar({ ok: true }));
    expect(alEnviar).toHaveBeenCalledTimes(1);
    expect(campoCantidad()).toBeEnabled();
  });

  it("si una excepción corta el envío, avisa y deja fija la foto (el insert pudo llegar)", async () => {
    mockEnviarReporte.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce({ ok: true });
    const { user, alEnviar } = await abrir();

    await escribirCantidad(user, "5");
    await elegirDeGaleria(user, "file:///a.jpg");
    await enviar(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("Algo falló. Reintenta.");
    expect(screen.getByRole("button", { name: "Elegir de la galería" })).toBeDisabled();
    expect(campoCantidad()).toBeDisabled();
    expect(campoComentario()).toBeDisabled();
    expect(screen.getByText(NOTA_FIJO)).toBeOnTheScreen();

    await reintentar(user);
    const [, primero] = mockEnviarReporte.mock.calls[0];
    const [, segundo] = mockEnviarReporte.mock.calls[1];
    expect(segundo.id).toBe(primero.id);
    expect(alEnviar).toHaveBeenCalledTimes(1);
  });

  it("si falló el insert (pudo llegar a la BD), bloquea cantidad, modo y comentario y reintenta con los mismos datos", async () => {
    mockEnviarReporte.mockResolvedValueOnce({ ...FALLO_INSERT, fotoSubida: false }).mockResolvedValueOnce({ ok: true });
    const { user, alEnviar } = await abrir();

    await escribirCantidad(user, "12,5");
    await user.type(campoComentario(), "Sector norte");
    await enviar(user);
    await screen.findByRole("alert");

    // Si el primer insert llegó, un reintento con otros valores daría 23505 ("enviado") y la BD guardaría los viejos.
    expect(campoCantidad()).toBeDisabled();
    expect(campoComentario()).toBeDisabled();
    expect(screen.getByRole("button", { name: "kg" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "%" })).toBeDisabled();
    expect(screen.getByText(NOTA_FIJO)).toBeOnTheScreen();

    await user.type(campoCantidad(), "9");
    await user.press(screen.getByRole("button", { name: "%" }));
    await user.type(campoComentario(), " y sur");
    await reintentar(user);

    const [, primero] = mockEnviarReporte.mock.calls[0];
    const [, segundo] = mockEnviarReporte.mock.calls[1];
    expect(segundo).toEqual(primero);
    expect(segundo).toMatchObject({ id: "id-1", cantidad: 12.5, comentario: "Sector norte", foto: null });
    expect(alEnviar).toHaveBeenCalledTimes(1);
  });
});

describe("foto", () => {
  it("prepara la foto elegida (uri, ancho, alto) y la manda como bytes", async () => {
    mockEnviarReporte.mockResolvedValue({ ok: true });
    const { user } = await abrir();

    await escribirCantidad(user, "5");
    await elegirDeGaleria(user, "file:///a.jpg");
    await enviar(user);

    expect(mockPrepararFoto).toHaveBeenCalledWith("file:///a.jpg", 4032, 3024);
    expect(mockEnviarReporte.mock.calls[0][1].foto).toBe(BYTES_A);
  });

  it("toma la foto con la cámara tras pedir permiso", async () => {
    mockLanzarCamara.mockResolvedValueOnce(foto("file:///camara-a.jpg"));
    const { user } = await abrir();

    await user.press(screen.getByRole("button", { name: "Tomar foto" }));

    expect(mockPedirPermisoCamara).toHaveBeenCalledTimes(1);
    expect(mockLanzarCamara).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Foto adjunta")).toBeOnTheScreen();
  });

  it("sin permiso de cámara avisa y no la abre", async () => {
    mockPedirPermisoCamara.mockResolvedValue({ granted: false });
    const { user } = await abrir();

    await user.press(screen.getByRole("button", { name: "Tomar foto" }));

    expect(await screen.findByText(/permite el acceso a la cámara/)).toBeOnTheScreen();
    expect(mockLanzarCamara).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Foto adjunta")).not.toBeOnTheScreen();
  });

  it("no deja enviar mientras el selector de fotos está abierto", async () => {
    const selector = selectorPendiente<ReturnType<typeof foto>>();
    mockLanzarGaleria.mockReturnValueOnce(selector.promesa);
    mockEnviarReporte.mockResolvedValue({ ok: true });
    const { user } = await abrir();

    await escribirCantidad(user, "5");
    await user.press(screen.getByRole("button", { name: "Elegir de la galería" }));
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeDisabled();
    await enviar(user);
    expect(mockEnviarReporte).not.toHaveBeenCalled();

    await selector.resolver(foto("file:///a.jpg"));
    expect(await screen.findByLabelText("Foto adjunta")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeEnabled();
    await enviar(user);
    expect(mockEnviarReporte.mock.calls[0][1].foto).toBe(BYTES_A);
  });

  it("no deja enviar mientras pide el permiso de cámara", async () => {
    const permiso = selectorPendiente<{ granted: boolean }>();
    mockPedirPermisoCamara.mockReturnValueOnce(permiso.promesa);
    const { user } = await abrir();

    await escribirCantidad(user, "5");
    await user.press(screen.getByRole("button", { name: "Tomar foto" }));
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeDisabled();

    await permiso.resolver({ granted: false });
    expect(await screen.findByText(/permite el acceso a la cámara/)).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Enviar reporte" })).toBeEnabled();
  });

  it("si un envío se cuela con el selector abierto y el insert falla, la foto que llega después no cambia el id ni la reemplaza", async () => {
    mockEnviarReporte.mockResolvedValueOnce(FALLO_INSERT).mockResolvedValueOnce({ ok: true });
    const { user } = await abrir();

    await escribirCantidad(user, "5");
    await elegirDeGaleria(user, "file:///a.jpg");
    const selector = selectorPendiente<ReturnType<typeof foto>>();
    mockLanzarGaleria.mockReturnValueOnce(selector.promesa);
    await user.press(screen.getByRole("button", { name: "Elegir de la galería" }));

    await act(onPressDe(screen.getByRole("button", { name: /Enviar reporte|Enviando/ })));
    expect(await screen.findByRole("alert")).toHaveTextContent(/No se pudo enviar el reporte/);

    // El insert pudo llegar a la BD: una foto nueva con un id nuevo duplicaría el avance.
    await selector.resolver(foto("file:///b.jpg"));
    expect(screen.getByLabelText("Foto adjunta").props.source).toEqual({ uri: "file:///a.jpg" });

    await reintentar(user);
    const [, primero] = mockEnviarReporte.mock.calls[0];
    const [, segundo] = mockEnviarReporte.mock.calls[1];
    expect(segundo.id).toBe(primero.id);
    expect(segundo.foto).toBe(BYTES_A);
  });

  it("si el usuario cancela el selector no cambia nada", async () => {
    const { user } = await abrir();

    await user.press(screen.getByRole("button", { name: "Elegir de la galería" }));

    expect(screen.queryByLabelText("Foto adjunta")).not.toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Quitar foto" })).not.toBeOnTheScreen();
  });

  it("si no se puede preparar la foto avisa, no envía y deja cambiar la foto", async () => {
    mockPrepararFoto.mockRejectedValueOnce(new Error("Failed to decode image"));
    const { user } = await abrir();

    await escribirCantidad(user, "5");
    await elegirDeGaleria(user, "file:///a.jpg");
    await enviar(user);

    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo preparar la foto. Prueba con otra o quítala.");
    expect(mockEnviarReporte).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Elegir de la galería" })).toBeEnabled();
  });

  describe("al cambiar la foto tras un envío fallido", () => {
    it("si falló la subida (no se intentó insertar), otra foto va con un id nuevo y se sube", async () => {
      mockEnviarReporte.mockResolvedValueOnce(FALLO_FOTO).mockResolvedValueOnce({ ok: true });
      const { user, alEnviar } = await abrir();

      await escribirCantidad(user, "5");
      await elegirDeGaleria(user, "file:///a.jpg");
      await enviar(user);
      await screen.findByRole("alert");
      expect(screen.getByRole("button", { name: "Elegir de la galería" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Tomar foto" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Quitar foto" })).toBeEnabled();

      await elegirDeGaleria(user, "file:///b.jpg");
      await reintentar(user);

      const [, primero, subida1] = mockEnviarReporte.mock.calls[0];
      const [, segundo, subida2] = mockEnviarReporte.mock.calls[1];
      expect(primero.foto).toBe(BYTES_A);
      expect(segundo.foto).toBe(BYTES_B);
      expect(segundo.id).not.toBe(primero.id);
      expect([subida1, subida2]).toEqual([false, false]);
      expect(alEnviar).toHaveBeenCalledTimes(1);
    });

    it("si falló la subida, quitar la foto también usa un id nuevo y no la manda", async () => {
      mockEnviarReporte.mockResolvedValueOnce(FALLO_FOTO).mockResolvedValueOnce({ ok: true });
      const { user } = await abrir();

      await escribirCantidad(user, "5");
      await elegirDeGaleria(user, "file:///a.jpg");
      await enviar(user);
      await screen.findByRole("alert");

      await user.press(screen.getByRole("button", { name: "Quitar foto" }));
      expect(screen.queryByLabelText("Foto adjunta")).not.toBeOnTheScreen();
      await reintentar(user);

      const [, primero] = mockEnviarReporte.mock.calls[0];
      const [, segundo, subida2] = mockEnviarReporte.mock.calls[1];
      expect(segundo.foto).toBeNull();
      expect(segundo.id).not.toBe(primero.id);
      expect(subida2).toBe(false);
    });

    it("una foto distinta nunca se trata como ya subida, aunque el envío anterior dijera lo contrario", async () => {
      // Caso hipotético (el core solo marca fotoSubida tras un insert): la regla es del formulario, no del core.
      mockEnviarReporte
        .mockResolvedValueOnce({ ...FALLO_FOTO, fotoSubida: true })
        .mockResolvedValueOnce({ ok: true });
      const { user } = await abrir();

      await escribirCantidad(user, "5");
      await elegirDeGaleria(user, "file:///a.jpg");
      await enviar(user);
      await screen.findByRole("alert");

      await elegirDeGaleria(user, "file:///b.jpg");
      await reintentar(user);

      expect(mockEnviarReporte.mock.calls[1][2]).toBe(false);
    });

    it("si falló el insert (pudo llegar a la BD), bloquea la foto y reintenta con el mismo id, sin volver a subirla", async () => {
      mockEnviarReporte.mockResolvedValueOnce(FALLO_INSERT).mockResolvedValueOnce({ ok: true });
      const { user, alEnviar } = await abrir();

      await escribirCantidad(user, "5");
      await elegirDeGaleria(user, "file:///a.jpg");
      await enviar(user);
      await screen.findByRole("alert");

      expect(screen.getByRole("button", { name: "Tomar foto" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Elegir de la galería" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Quitar foto" })).toBeDisabled();
      expect(screen.getByText(NOTA_FIJO)).toBeOnTheScreen();

      await reintentar(user);

      const [, primero, subida1] = mockEnviarReporte.mock.calls[0];
      const [, segundo, subida2] = mockEnviarReporte.mock.calls[1];
      expect(segundo.id).toBe(primero.id);
      expect(segundo.foto).toBe(BYTES_A);
      expect([subida1, subida2]).toEqual([false, true]);
      // Los bytes se preparan una sola vez: el reintento no vuelve a decodificar la foto.
      expect(mockPrepararFoto).toHaveBeenCalledTimes(1);
      expect(alEnviar).toHaveBeenCalledTimes(1);
    });

    it("tras un insert intentado sin foto, no deja agregar una (el id quedó fijo)", async () => {
      mockEnviarReporte.mockResolvedValueOnce({ ...FALLO_INSERT, fotoSubida: false }).mockResolvedValueOnce({ ok: true });
      const { user } = await abrir();

      await escribirCantidad(user, "5");
      await enviar(user);
      await screen.findByRole("alert");

      expect(screen.getByText(NOTA_FIJO)).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Tomar foto" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Elegir de la galería" })).toBeDisabled();

      await user.press(screen.getByRole("button", { name: "Elegir de la galería" }));
      expect(mockLanzarGaleria).not.toHaveBeenCalled();

      await reintentar(user);
      const [, primero] = mockEnviarReporte.mock.calls[0];
      const [, segundo] = mockEnviarReporte.mock.calls[1];
      expect(segundo.id).toBe(primero.id);
      expect(segundo.foto).toBeNull();
    });
  });
});

describe("accesibilidad en obra", () => {
  it("todos los botones miden al menos 48 de alto", async () => {
    const { user } = await abrir();
    await elegirDeGaleria(user, "file:///a.jpg");

    const botones = screen.getAllByRole("button");
    expect(botones.length).toBeGreaterThanOrEqual(6);
    for (const boton of botones) {
      expect(StyleSheet.flatten(boton.props.style).minHeight).toBeGreaterThanOrEqual(48);
    }
  });
});
