/** @jest-environment node */
import manifest from "./manifest";

it("declara una app instalable que abre en su inicio", () => {
  expect(manifest()).toMatchObject({
    name: "Ovalle Obras",
    short_name: "Obras",
    start_url: "/",
    display: "standalone",
    icons: [expect.objectContaining({ src: "/icon.svg" })],
  });
});
