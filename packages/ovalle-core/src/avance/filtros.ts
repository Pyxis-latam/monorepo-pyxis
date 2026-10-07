import type { NodoAvance } from "./tipos";

export type Filtro = "todas" | "atrasadas" | "en_curso" | "terminadas";

export function enCurso(n: NodoAvance, hoy: string): boolean {
  return (
    n.esHoja &&
    n.estado !== "terminada" &&
    n.fecha_inicio !== null &&
    n.fecha_fin !== null &&
    n.fecha_inicio <= hoy &&
    hoy <= n.fecha_fin
  );
}

export function filtrarArbol(raices: NodoAvance[], filtro: Filtro, hoy: string): NodoAvance[] {
  if (filtro === "todas") return raices;
  const cumple = (n: NodoAvance) =>
    filtro === "atrasadas" ? n.estado === "atrasada" : filtro === "terminadas" ? n.estado === "terminada" : enCurso(n, hoy);
  const podar = (nodos: NodoAvance[]): NodoAvance[] =>
    nodos.flatMap((n) => {
      if (n.esHoja) return cumple(n) ? [n] : [];
      const hijos = podar(n.hijos);
      return hijos.length > 0 ? [{ ...n, hijos }] : [];
    });
  return podar(raices);
}
