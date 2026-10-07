import type { PartidaImportada } from "./validar";

export type PartidaExistente = Omit<PartidaImportada, "codigo_padre" | "orden"> & { tieneReportes: boolean };

export type Diferencias = {
  agregadas: string[];
  modificadas: string[];
  eliminadas: string[];
  /** Cambios que la importación rechazaría (misma regla que aplicar_importacion en la BD). */
  bloqueadas: string[];
};

const CAMPOS = ["descripcion", "unidad", "cantidad", "precio_unitario", "fecha_inicio", "fecha_fin"] as const;

export function calcularDiferencias(existentes: PartidaExistente[], nuevas: PartidaImportada[]): Diferencias {
  const nuevasPorCodigo = new Map(nuevas.map((p) => [p.codigo, p]));
  const existentesPorCodigo = new Map(existentes.map((p) => [p.codigo, p]));
  const d: Diferencias = { agregadas: [], modificadas: [], eliminadas: [], bloqueadas: [] };

  for (const p of nuevas) {
    const previa = existentesPorCodigo.get(p.codigo);
    if (!previa) {
      d.agregadas.push(p.codigo);
      continue;
    }
    if (CAMPOS.some((c) => (previa[c] ?? null) !== (p[c] ?? null))) d.modificadas.push(p.codigo);
    if (previa.tieneReportes && p.cantidad === null) d.bloqueadas.push(p.codigo);
  }
  for (const p of existentes) {
    if (nuevasPorCodigo.has(p.codigo)) continue;
    d.eliminadas.push(p.codigo);
    if (p.tieneReportes) d.bloqueadas.push(p.codigo);
  }
  return d;
}
