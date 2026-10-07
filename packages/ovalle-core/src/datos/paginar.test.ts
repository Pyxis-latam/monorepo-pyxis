import { traerTodo } from "./paginar";

/** Simula una tabla de `total` filas servida por PostgREST con `.range(desde, hasta)`. */
function tabla(total: number) {
  const filas = Array.from({ length: total }, (_, i) => ({ n: i }));
  const llamadas: [number, number][] = [];
  const pagina = jest.fn(async (desde: number, hasta: number) => {
    llamadas.push([desde, hasta]);
    return { data: filas.slice(desde, hasta + 1), error: null };
  });
  return { filas, llamadas, pagina };
}

describe("traerTodo", () => {
  it("junta todas las filas, en orden, a través de varias páginas", async () => {
    const { filas, llamadas, pagina } = tabla(2500);
    const resultado = await traerTodo(pagina, 1000);
    expect(resultado).toHaveLength(2500);
    expect(resultado).toEqual(filas);
    expect(llamadas).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("con exactamente un tamaño de página pide una segunda página vacía y se detiene", async () => {
    const { llamadas, pagina } = tabla(1000);
    const resultado = await traerTodo(pagina, 1000);
    expect(resultado).toHaveLength(1000);
    expect(llamadas).toEqual([[0, 999], [1000, 1999]]);
  });

  it("con menos filas que una página hace una sola llamada", async () => {
    const { llamadas, pagina } = tabla(3);
    expect(await traerTodo(pagina)).toHaveLength(3);
    expect(llamadas).toEqual([[0, 999]]);
  });

  it("devuelve [] si no hay filas (data nula incluida)", async () => {
    expect(await traerTodo(async () => ({ data: [], error: null }))).toEqual([]);
    expect(await traerTodo(async () => ({ data: null, error: null }))).toEqual([]);
  });

  it("lanza el error de una página intermedia", async () => {
    const falla = new Error("boom");
    const pagina = jest.fn(async (desde: number) =>
      desde === 1000
        ? { data: null, error: falla }
        : { data: Array.from({ length: 1000 }, (_, i) => ({ n: desde + i })), error: null },
    );
    await expect(traerTodo(pagina, 1000)).rejects.toBe(falla);
    expect(pagina).toHaveBeenCalledTimes(2);
  });
});
