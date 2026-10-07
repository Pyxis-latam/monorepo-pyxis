/** @jest-environment node */
import manifest from "./manifest";

it("declara una app instalable que abre en su inicio", () => {
  expect(manifest()).toMatchObject({
    name: "Río Limarí Obras",
    short_name: "RL Obras",
    start_url: "/",
    display: "standalone",
    theme_color: "#004D69",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  });
});
