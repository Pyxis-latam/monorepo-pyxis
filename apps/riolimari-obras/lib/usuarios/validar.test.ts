/** @jest-environment node */
import { validarNuevoUsuario } from "./validar";

const fd = (datos: Record<string, string>) => {
  const f = new FormData();
  Object.entries(datos).forEach(([k, v]) => f.set(k, v));
  return f;
};

describe("validarNuevoUsuario", () => {
  it("normaliza email y nombre", () => {
    expect(validarNuevoUsuario(fd({ nombre: "  Juan Pérez ", email: " Juan@RioLimari.CL ", rol: "terreno" }))).toEqual({
      ok: true, nombre: "Juan Pérez", email: "juan@riolimari.cl", rol: "terreno",
    });
  });
  it.each([
    [{ nombre: "", email: "a@b.cl", rol: "terreno" }, "Falta el nombre."],
    [{ nombre: "Ana", email: "no-es-email", rol: "terreno" }, "El email no es válido."],
    [{ nombre: "Ana", email: "a@b.cl", rol: "jefe" }, "Rol inválido."],
  ])("rechaza %p", (datos, mensaje) => {
    expect(validarNuevoUsuario(fd(datos))).toEqual({ ok: false, mensaje });
  });
});
