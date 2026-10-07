import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ovalle Obras",
    short_name: "Obras",
    description: "Reporte de avance de obra — Constructora Ovalle",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: "#d9622b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
