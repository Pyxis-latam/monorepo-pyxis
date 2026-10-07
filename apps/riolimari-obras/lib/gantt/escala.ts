import { aplanar } from "@pyxis/riolimari-core/avance/arbol";
import type { NodoAvance } from "@pyxis/riolimari-core/avance/tipos";
import { diasEntre } from "@pyxis/riolimari-core/fechas";

export type Rango = { desde: string; hasta: string; dias: number };

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export function rangoDe(nodos: NodoAvance[]): Rango | null {
  const conFechas = aplanar(nodos).filter((n) => n.esHoja && n.fecha_inicio && n.fecha_fin);
  if (conFechas.length === 0) return null;
  const desde = conFechas.map((n) => n.fecha_inicio!).sort()[0];
  const hasta = conFechas.map((n) => n.fecha_fin!).sort().at(-1)!;
  return { desde, hasta, dias: diasEntre(desde, hasta) + 1 };
}

export function posicionBarra(inicio: string, fin: string, rango: Rango) {
  return {
    izquierda: diasEntre(rango.desde, inicio) / rango.dias,
    ancho: (diasEntre(inicio, fin) + 1) / rango.dias,
  };
}

/** Centro del día dentro del rango, o null si queda fuera. */
export function posicionDia(dia: string, rango: Rango): number | null {
  const d = diasEntre(rango.desde, dia);
  if (d < 0 || d >= rango.dias) return null;
  return (d + 0.5) / rango.dias;
}

export function meses(rango: Rango): { etiqueta: string; izquierda: number }[] {
  const resultado: { etiqueta: string; izquierda: number }[] = [];
  let [a, m] = rango.desde.split("-").map(Number);
  let dia = rango.desde;
  while (dia <= rango.hasta) {
    resultado.push({ etiqueta: `${MESES[m - 1]} ${a}`, izquierda: diasEntre(rango.desde, dia) / rango.dias });
    m += 1;
    if (m > 12) { m = 1; a += 1; }
    dia = `${a}-${String(m).padStart(2, "0")}-01`;
  }
  return resultado;
}
