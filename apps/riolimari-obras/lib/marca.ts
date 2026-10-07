// Marca del cliente: Constructora e Inmobiliaria Río Limarí (Ovalle, Región de Coquimbo).
// Los colores viven en app/globals.css (--color-obra-accent y compañía) y, en la app móvil,
// en lib/tema.ts.

export const NOMBRE_APP = "Río Limarí Obras";
/** Nombre corto para el ícono instalado (manifest). */
export const NOMBRE_CORTO = "RL Obras";
export const EMPRESA = "Constructora e Inmobiliaria Río Limarí";
/** Color primario (azul petróleo); el mismo que --color-obra-accent. */
export const COLOR_PRIMARIO = "#004D69";

/** Logo blanco sobre transparente (591 × 482): siempre va sobre el color primario. */
export const LOGO = { ruta: "/marca/logo-blanco.png", ancho: 591, alto: 482, alt: "Empresas Río Limarí" } as const;
