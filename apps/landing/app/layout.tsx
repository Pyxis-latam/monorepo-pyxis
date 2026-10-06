import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";
import "./globals.css";

const display = Geist({
  subsets: ["latin"],
  variable: "--font-display",
});

const serifAccent = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif-accent",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono-label",
  weight: ["400", "500"],
});

const description =
  "Pyxis Labs recompone empresas medianas: procesos, equipo comercial e integraciones con el ERP que ya tienen. Pyxis Ventures construye empresas que operan sin personas. Hermes, distribuidora de insumos de oficina, es la primera.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.pyxis-latam.cl"),
  title: "Pyxis — Empresas que rinden más con las mismas personas. O con ninguna.",
  description,
  openGraph: {
    title: "Pyxis — Empresas que rinden más con las mismas personas. O con ninguna.",
    description,
    type: "website",
    locale: "es_ES",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pyxis — Empresas que rinden más con las mismas personas. O con ninguna.",
    description,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${serifAccent.variable} ${mono.variable}`}
    >
      <body className="bg-pyxis-bg font-display text-pyxis-fg antialiased">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
