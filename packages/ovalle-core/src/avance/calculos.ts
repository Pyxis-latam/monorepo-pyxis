import { diasEntre } from "../fechas";
import type { Estado } from "./tipos";

export function porcentajeEsperado(inicio: string | null, fin: string | null, hoy: string): number | null {
  if (!inicio || !fin) return null;
  if (hoy < inicio) return 0;
  if (hoy >= fin) return 1;
  const total = diasEntre(inicio, fin);
  return total <= 0 ? 1 : diasEntre(inicio, hoy) / total;
}

export function estadoHoja(porcentaje: number, esperado: number | null): Estado {
  if (porcentaje + 1e-9 >= 1) return "terminada";
  if (esperado === null) return "sin_fechas";
  return porcentaje + 1e-9 < esperado ? "atrasada" : "al_dia";
}
