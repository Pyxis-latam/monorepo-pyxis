/**
 * PostgREST corta cada respuesta en `max_rows` (1000 por defecto) sin avisar. Esta función pide
 * páginas con `.range(desde, hasta)` hasta que una venga con menos filas que `tamano`.
 * Quien la llame debe ordenar la consulta de forma determinista (si no, las páginas pueden repetir o saltarse filas).
 */
export async function traerTodo<T>(
  pagina: (desde: number, hasta: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  tamano = 1000,
): Promise<T[]> {
  const todas: T[] = [];
  for (let desde = 0; ; desde += tamano) {
    const { data, error } = await pagina(desde, desde + tamano - 1);
    if (error) throw error;
    const filas = data ?? [];
    todas.push(...filas);
    if (filas.length < tamano) return todas;
  }
}
