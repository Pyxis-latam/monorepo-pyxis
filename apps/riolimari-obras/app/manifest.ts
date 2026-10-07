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
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
