import { parseNumeroCL } from "../numeros";

export function parseCantidadIngresada(
  texto: string,
  modo: "cantidad" | "porcentaje",
  cantidadPartida: number,
): { ok: true; cantidad: number } | { ok: false; mensaje: string } {
  const n = parseNumeroCL(texto.replace("%", ""));
  if (!n.ok || n.valor === null || n.valor <= 0) return { ok: false, mensaje: "Ingresa una cantidad mayor que 0." };
  const cantidad = modo === "porcentaje" ? (cantidadPartida * n.valor) / 100 : n.valor;
  return { ok: true, cantidad: Math.round(cantidad * 10000) / 10000 };
}
