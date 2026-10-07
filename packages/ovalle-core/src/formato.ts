const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const cantidad = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });

export function formatoCLP(n: number): string {
  return clp.format(Math.round(n));
}

/** Recibe una fracción (0.45) y devuelve "45,0%". */
export function formatoPorcentaje(fraccion: number): string {
  return `${(fraccion * 100).toFixed(1).replace(".", ",")}%`;
}

/** "2026-11-03" → "03-11-2026". */
export function formatoFecha(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}-${m}-${a}`;
}

export function formatoCantidad(n: number): string {
  return cantidad.format(n);
}

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
