export type Resultado<T> = { ok: true; valor: T } | { ok: false };

const MILES_CON_PUNTO = /^-?\d{1,3}(\.\d{3})+$/;

/** Lee números escritos a la chilena ("4.200", "1.150,5", "$ 12.000"). */
export function parseNumeroCL(v: unknown): Resultado<number | null> {
  if (v === null || v === undefined) return { ok: true, valor: null };
  if (typeof v === "number") return Number.isFinite(v) ? { ok: true, valor: v } : { ok: false };
  if (typeof v !== "string") return { ok: false };
  let t = v.replace(/\$/g, "").replace(/\s/g, "");
  if (t === "") return { ok: true, valor: null };
  if (t.includes(",")) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (MILES_CON_PUNTO.test(t)) {
    t = t.replace(/\./g, "");
  }
  if (!/^-?\d+(\.\d+)?$/.test(t)) return { ok: false };
  return { ok: true, valor: Number(t) };
}
