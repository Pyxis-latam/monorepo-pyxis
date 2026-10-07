import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pyxis/riolimari-core"],
  // El informe PDF lee el logo de public/ en tiempo de ejecución (lib/exportar/pdf.tsx).
  outputFileTracingIncludes: { "/admin/obras/*/exportar/pdf": ["./public/marca/logo-blanco.png"] },
  experimental: {
    // Excel de presupuesto (≤ 4 MB) por server action; Vercel corta en 4.5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
    proxyClientMaxBodySize: "4.5mb",
  },
};

export default nextConfig;
