export type Estado = "al_dia" | "atrasada" | "terminada" | "sin_fechas";

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  al_dia: "Al día",
  atrasada: "Atrasada",
  terminada: "Terminada",
  sin_fechas: "Sin fechas",
};

export type PartidaPlan = {
  id: string;
  parent_id: string | null;
  codigo: string;
  descripcion: string;
  unidad: string | null;
  cantidad: number | null;
  precio_unitario: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  orden: number;
};

export type NodoAvance = PartidaPlan & {
  esHoja: boolean;
  nivel: number;
  /** Suma de reportes no anulados (0 en capítulos). */
  ejecutado: number;
  /** Fracción; en hojas ejecutado/cantidad (puede pasar de 1), en capítulos por monto. */
  porcentaje: number;
  porcentajeEsperado: number | null;
  montoPresupuestado: number;
  montoEjecutado: number;
  estado: Estado;
  hijos: NodoAvance[];
};

export type ResumenObra = {
  porcentajeFisico: number;
  montoPresupuestado: number;
  montoEjecutado: number;
  atrasadas: number;
  hojas: number;
};
