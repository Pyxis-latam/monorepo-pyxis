export type ClaveColumna =
  | "codigo"
  | "descripcion"
  | "unidad"
  | "cantidad"
  | "precio_unitario"
  | "fecha_inicio"
  | "fecha_fin";

export const COLUMNAS: readonly { clave: ClaveColumna; titulo: string }[] = [
  { clave: "codigo", titulo: "Código" },
  { clave: "descripcion", titulo: "Descripción" },
  { clave: "unidad", titulo: "Unidad" },
  { clave: "cantidad", titulo: "Cantidad" },
  { clave: "precio_unitario", titulo: "Precio unitario" },
  { clave: "fecha_inicio", titulo: "Fecha inicio" },
  { clave: "fecha_fin", titulo: "Fecha fin" },
];

export function normalizarEncabezado(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
