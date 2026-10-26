import type { MetadataRoute } from "next";
import { guideAlternates, guides } from "@/lib/guides";
import { lastReviewed, siteURL } from "@/lib/site";

export const dynamic = "force-static";

const absolute = (paths: Record<string, string>) => Object.fromEntries(Object.entries(paths).map(([k, v]) => [k, `${siteURL}${v}`]));

export default function sitemap(): MetadataRoute.Sitemap {
  const home = absolute({ is: "/is/", en: "/en/", "x-default": "/is/" });
  const index = absolute(guideAlternates());
  const entries: MetadataRoute.Sitemap = (["is", "en"] as const).flatMap((locale) => [
    { url: home[locale], lastModified: lastReviewed, changeFrequency: "weekly" as const, priority: locale === "is" ? 1 : 0.9, alternates: { languages: home } },
    { url: index[locale], lastModified: lastReviewed, changeFrequency: "monthly" as const, priority: 0.8, alternates: { languages: index } },
  ]);
  for (const guide of guides.is) {
    const languages = absolute(guideAlternates(guide.id));
    for (const locale of ["is", "en"] as const)
      entries.push({ url: languages[locale], lastModified: lastReviewed, changeFrequency: "monthly", priority: guide.kind === "provider" ? 0.8 : 0.7, alternates: { languages } });
  }
  return entries;
}
