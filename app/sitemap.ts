import type { MetadataRoute } from "next";

function publicOrigin(): string {
  const origin = (process.env.DMARK_PUBLIC_ORIGIN || "").trim();
  return origin || "https://dmark.is";
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${publicOrigin()}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
