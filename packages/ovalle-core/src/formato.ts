const clp = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const cantidad = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });
// h23: con `hour12: false` algunos motores dan "24:00" a la medianoche.
const momento = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

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

/** Instante ISO → "05-11-2026 11:32" en hora de Chile. Arma el texto desde las partes, no desde la puntuación del locale. */
export function formatoMomento(iso: string): string {
  const partes: Record<string, string> = {};
  for (const { type, value } of momento.formatToParts(new Date(iso))) partes[type] = value;
  return `${partes.day}-${partes.month}-${partes.year} ${partes.hour}:${partes.minute}`;
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
