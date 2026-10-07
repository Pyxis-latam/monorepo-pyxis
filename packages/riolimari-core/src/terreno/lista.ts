import { enCurso } from "../avance/filtros";
import type { NodoAvance } from "../avance/tipos";

export type ItemPartida = {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string;
  cantidad: number;
  ejecutado: number;
  porcentaje: number;
  capitulo: string | null;
};

function recorrer(nodos: NodoAvance[], capitulo: string | null, fn: (n: NodoAvance, capitulo: string | null) => void) {
  for (const n of nodos) {
    if (n.esHoja) fn(n, capitulo);
    else recorrer(n.hijos, `${n.codigo} ${n.descripcion}`, fn);
  }
}

// Una hoja es toda partida con cantidad (ver construirArbol); la unidad puede venir vacía del Excel.
const item = (n: NodoAvance, capitulo: string | null): ItemPartida => ({
  id: n.id,
  codigo: n.codigo,
  descripcion: n.descripcion,
  unidad: n.unidad ?? "",
  cantidad: n.cantidad!,
  ejecutado: n.ejecutado,
  porcentaje: n.porcentaje,
  capitulo,
});

export function itemsTerreno(raices: NodoAvance[]): ItemPartida[] {
  const items: ItemPartida[] = [];
  recorrer(raices, null, (n, c) => items.push(item(n, c)));
  return items;
}

export function enCursoHoy(raices: NodoAvance[], hoy: string): ItemPartida[] {
  const items: ItemPartida[] = [];
  recorrer(raices, null, (n, c) => {
    if (enCurso(n, hoy)) items.push(item(n, c));
  });
  return items;
}

const normalizar = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function buscarPartidas(items: ItemPartida[], texto: string): ItemPartida[] {
  const q = normalizar(texto.trim());
  if (!q) return items;
  return items.filter((i) => normalizar(`${i.codigo} ${i.descripcion}`).includes(q));
}
