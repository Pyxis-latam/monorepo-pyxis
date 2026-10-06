import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.pyxis-latam.cl",
      lastModified: new Date("2026-09-15"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
