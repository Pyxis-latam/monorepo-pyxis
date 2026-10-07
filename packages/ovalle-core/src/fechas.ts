import type { Resultado } from "./numeros";

const DIA_MS = 86_400_000;
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);

function iso(a: number, m: number, d: number): string | null {
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return fecha.toISOString().slice(0, 10);
}

/** Fecha de una celda Excel → "YYYY-MM-DD". */
export function parseFecha(v: unknown): Resultado<string | null> {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
    return { ok: true, valor: null };
  }
  if (v instanceof Date) {
    return Number.isNaN(v.getTime()) ? { ok: false } : { ok: true, valor: v.toISOString().slice(0, 10) };
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    return { ok: true, valor: new Date(EPOCA_EXCEL + Math.round(v) * DIA_MS).toISOString().slice(0, 10) };
  }
  if (typeof v === "string") {
    const m = v.trim().match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (m) {
      const valor = iso(Number(m[3]), Number(m[2]), Number(m[1]));
      return valor ? { ok: true, valor } : { ok: false };
    }
  }
  return { ok: false };
}

const FORMATO_CHILE = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Fecha de hoy en Chile como "YYYY-MM-DD". Se arma desde `formatToParts` y no desde el
 * texto formateado: este módulo también corre en React Native (Hermes), donde el formato
 * por locale difiere.
 */
export function hoyEnChile(ahora: Date = new Date()): string {
  const partes = FORMATO_CHILE.formatToParts(ahora);
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value ?? "";
  return `${parte("year").padStart(4, "0")}-${parte("month").padStart(2, "0")}-${parte("day").padStart(2, "0")}`;
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / DIA_MS);
}
