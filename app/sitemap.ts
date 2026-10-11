import type { MetadataRoute } from "next";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const languages = { is: "https://dmark.is/is/", en: "https://dmark.is/en/", "x-default": "https://dmark.is/is/" };
  return (["is", "en"] as const).map(locale => ({ url: languages[locale], changeFrequency: "weekly", priority: locale === "is" ? 1 : 0.8, alternates: { languages } }));
}
