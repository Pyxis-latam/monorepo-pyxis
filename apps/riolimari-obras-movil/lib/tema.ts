/** Mismos colores que la web (`apps/riolimari-obras/app/globals.css`). */
export const colores = {
  fondo: "#f6f5f2",
  texto: "#1d1d1b",
  /** Azul petróleo de Río Limarí: botones, pestaña activa y la zona del logo (texto blanco encima: ~9:1). */
  acento: "#004D69",
  ok: "#2f8f46",
  alerta: "#c0392b",
  linea: "#e2e0da",
  blanco: "#ffffff",
  /** Texto de ayuda (placeholder). */
  suave: "#8a8a85",
  /** Fondos de los avisos de error y de reporte enviado. */
  fondoAlerta: "#fdecea",
  fondoOk: "#e3f4e7",
} as const;

/** Alto mínimo de botones y campos: se usan con una mano y con guantes en obra. */
export const ALTO_TOQUE = 52;
