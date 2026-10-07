import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pyxis/riolimari-core"],
  experimental: {
    // Excel de presupuesto (≤ 4 MB) por server action; Vercel corta en 4.5 MB.
    serverActions: { bodySizeLimit: "4.5mb" },
    proxyClientMaxBodySize: "4.5mb",
  },
};

export default nextConfig;
