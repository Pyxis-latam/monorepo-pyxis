import type { Metadata, Viewport } from "next";
import { COLOR_PRIMARIO, EMPRESA, NOMBRE_APP } from "@/lib/marca";
import "./globals.css";

export const metadata: Metadata = {
  title: NOMBRE_APP,
  description: `Avance de obra en terreno — ${EMPRESA}`,
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: COLOR_PRIMARIO,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
