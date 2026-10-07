/** @jest-environment node */
import { nuevoIdReporte } from "./id";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("nuevoIdReporte", () => {
  afterEach(() => jest.restoreAllMocks());

  it("usa crypto.randomUUID cuando existe", () => {
    jest.spyOn(crypto, "randomUUID").mockReturnValue("11111111-2222-4333-8444-555555555555");
    expect(nuevoIdReporte()).toBe("11111111-2222-4333-8444-555555555555");
  });

  it("arma un uuid v4 válido cuando randomUUID no existe (http por red local no es contexto seguro)", () => {
    // Sombrea el método heredado con una propiedad propia; se quita al terminar.
    Object.defineProperty(crypto, "randomUUID", { value: undefined, configurable: true });
    try {
      expect(nuevoIdReporte()).toMatch(UUID);
      expect(nuevoIdReporte()).not.toBe(nuevoIdReporte());
    } finally {
      delete (crypto as { randomUUID?: unknown }).randomUUID;
    }
  });

  it("no repite ids", () => {
    expect(nuevoIdReporte()).not.toBe(nuevoIdReporte());
    expect(nuevoIdReporte()).toMatch(UUID);
  });
});
