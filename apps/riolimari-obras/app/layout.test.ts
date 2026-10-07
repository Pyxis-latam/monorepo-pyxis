/** @jest-environment node */
import { metadata, viewport } from "./layout";

it("presenta la app con el nombre y el color de Río Limarí", () => {
  expect(metadata).toMatchObject({
    title: "Río Limarí Obras",
    description: expect.stringContaining("Constructora e Inmobiliaria Río Limarí"),
  });
  expect(viewport).toMatchObject({ themeColor: "#004D69" });
});
