/** @jest-environment node */
import type { FilaCruda } from "./leer";
import { validarFilas } from "./validar";

function fila(n: number, datos: Partial<FilaCruda>): FilaCruda {
  return {
    fila: n,
    codigo: "",
    descripcion: null,
    unidad: null,
    cantidad: null,
    precio_unitario: null,
    fecha_inicio: null,
    fecha_fin: null,
    ...datos,
  };
}

describe("validarFilas", () => {
  it("arma capítulos y hojas con padre, orden y valores normalizados", () => {
    const r = validarFilas([
      fila(2, { codigo: "1", descripcion: "Obra gruesa" }),
      fila(3, {
        codigo: "1.1",
        descripcion: "Enfierradura",
        unidad: "kg",
        cantidad: "4.200",
        precio_unitario: "$ 1.150",
        fecha_inicio: "03-11-2026",
        fecha_fin: new Date(Date.UTC(2026, 10, 14)),
      }),
    ]);
    expect(r.errores).toEqual([]);
    expect(r.partidas).toEqual([
      { codigo: "1", codigo_padre: null, descripcion: "Obra gruesa", unidad: null, cantidad: null, precio_unitario: null, fecha_inicio: null, fecha_fin: null, orden: 0 },
      { codigo: "1.1", codigo_padre: "1", descripcion: "Enfierradura", unidad: "kg", cantidad: 4200, precio_unitario: 1150, fecha_inicio: "2026-11-03", fecha_fin: "2026-11-14", orden: 1 },
    ]);
  });

  it("reporta cada problema con su número de fila", () => {
    const r = validarFilas([
      fila(2, { codigo: "1", descripcion: "Cap" }),
      fila(3, { codigo: "1", descripcion: "Duplicada" }),
      fila(4, { codigo: "2.1", descripcion: "Sin padre", unidad: "m2", cantidad: 1, precio_unitario: 1 }),
      fila(5, { codigo: "1.1", descripcion: "Sin unidad", cantidad: 3, precio_unitario: 1 }),
      fila(6, { codigo: "1.2", descripcion: "Cantidad mala", unidad: "m2", cantidad: "mucho", precio_unitario: 1 }),
      fila(7, { codigo: "1.3", descripcion: "Fechas al revés", unidad: "m2", cantidad: 1, precio_unitario: 1, fecha_inicio: "10-11-2026", fecha_fin: "01-11-2026" }),
      fila(8, { codigo: "1.4", unidad: "m2", cantidad: 1, precio_unitario: 1 }),
      fila(9, { codigo: "1.x", descripcion: "Código raro" }),
      fila(10, { codigo: "1.5", descripcion: "Sin precio", unidad: "m2", cantidad: 1 }),
      fila(11, { codigo: "1.6", descripcion: "Cero", unidad: "m2", cantidad: 0, precio_unitario: 1 }),
    ]);
    expect(r.errores).toEqual([
      { fila: 3, mensaje: "Código 1 repetido (ya está en la fila 2)." },
      { fila: 4, mensaje: "La partida 2.1 no tiene capítulo padre 2 en el archivo." },
      { fila: 5, mensaje: "Una partida con cantidad necesita unidad." },
      { fila: 6, mensaje: "Cantidad no es un número." },
      { fila: 7, mensaje: "Fecha fin es anterior a fecha inicio." },
      { fila: 8, mensaje: "Falta la descripción." },
      { fila: 9, mensaje: "Código inválido: use números separados por puntos (ej. 1.2.3)." },
      { fila: 10, mensaje: "Una partida con cantidad necesita precio unitario." },
      { fila: 11, mensaje: "Cantidad debe ser mayor que 0." },
    ]);
  });

  it("no permite que una partida con cantidad tenga subpartidas", () => {
    const r = validarFilas([
      fila(2, { codigo: "1", descripcion: "Hoja", unidad: "m2", cantidad: 5, precio_unitario: 1 }),
      fila(3, { codigo: "1.1", descripcion: "Hija", unidad: "m2", cantidad: 1, precio_unitario: 1 }),
    ]);
    expect(r.errores).toEqual([
      { fila: 2, mensaje: "La partida 1 tiene cantidad y también subpartidas; deje la cantidad solo en las subpartidas." },
    ]);
  });

  it("rechaza el código guardado como número en Excel", () => {
    const r = validarFilas([fila(2, { codigo: "1.1", codigoNumerico: true, descripcion: "Capítulo" })]);
    expect(r.partidas).toEqual([]);
    expect(r.errores).toEqual([
      { fila: 2, mensaje: "Código guardado como número; formatee la columna Código como texto." },
    ]);
  });

  it("trata las celdas con error de Excel como cantidad inválida, no como capítulo", () => {
    const r = validarFilas([
      fila(2, { codigo: "1", descripcion: "Cap" }),
      fila(3, { codigo: "1.1", descripcion: "Div cero", unidad: "m2", cantidad: "#DIV/0!", precio_unitario: 1 }),
      fila(4, { codigo: "1.2", descripcion: "Sin valor", unidad: "m2", cantidad: "#SIN_VALOR", precio_unitario: 1 }),
    ]);
    expect(r.errores).toEqual([
      { fila: 3, mensaje: "Cantidad no es un número." },
      { fila: 4, mensaje: "Cantidad no es un número." },
    ]);
  });

  it("exige al menos una fila", () => {
    expect(validarFilas([]).errores).toEqual([{ fila: 1, mensaje: "El archivo no tiene partidas." }]);
  });
});
