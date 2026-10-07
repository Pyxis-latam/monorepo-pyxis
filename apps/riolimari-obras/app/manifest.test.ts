/** @jest-environment node */
import manifest from "./manifest";

it("declara una app instalable que abre en su inicio", () => {
  expect(manifest()).toMatchObject({
    name: "Río Limarí Obras",
    short_name: "RL Obras",
    start_url: "/",
    display: "standalone",
    theme_color: "#004D69",
    icons: [expect.objectContaining({ src: "/icon.svg" })],
  });
});
