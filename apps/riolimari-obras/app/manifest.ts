import type { MetadataRoute } from "next";
import { COLOR_PRIMARIO, EMPRESA, NOMBRE_APP, NOMBRE_CORTO } from "@/lib/marca";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: NOMBRE_APP,
    short_name: NOMBRE_CORTO,
    description: `Reporte de avance de obra — ${EMPRESA}`,
    start_url: "/",
    display: "standalone",
    background_color: "#f6f5f2",
    theme_color: COLOR_PRIMARIO,
    // Los genera scripts/generar-iconos.mjs (igual que app/icon.png y app/apple-icon.png).
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
