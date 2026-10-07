import type { Resultado } from "./numeros";

const DIA_MS = 86_400_000;
const EPOCA_EXCEL = Date.UTC(1899, 11, 30);
/** Rango de años aceptado: fuera de él es un error de tipeo (o un serial basura), no una fecha de obra. */
const ANIO_MIN = 1900;
const ANIO_MAX = 2200;

/** "YYYY-MM-DD" de una fecha UTC, o null si es inválida o cae fuera de 1900–2200 (nunca lanza). */
function aIso(fecha: Date): string | null {
  if (Number.isNaN(fecha.getTime())) return null;
  const anio = fecha.getUTCFullYear();
  if (anio < ANIO_MIN || anio > ANIO_MAX) return null;
  return fecha.toISOString().slice(0, 10);
}

function iso(a: number, m: number, d: number): string | null {
  const fecha = new Date(Date.UTC(a, m - 1, d));
  if (fecha.getUTCFullYear() !== a || fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return aIso(fecha);
}

/** Fecha de una celda Excel → "YYYY-MM-DD". */
export function parseFecha(v: unknown): Resultado<string | null> {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) {
    return { ok: true, valor: null };
  }
  if (v instanceof Date) {
    const valor = aIso(v);
    return valor ? { ok: true, valor } : { ok: false };
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v < 1) return { ok: false };
    // La parte decimal es la hora del día: se trunca (redondear pasaría las 12:00 en adelante al día siguiente).
    const valor = aIso(new Date(EPOCA_EXCEL + Math.floor(v) * DIA_MS));
    return valor ? { ok: true, valor } : { ok: false };
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
