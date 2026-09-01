import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://dmark.is/is/",
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://dmark.is/en/",
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];
}
