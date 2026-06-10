import type { MetadataRoute } from "next";

function publicOrigin(): string {
  const origin = (process.env.DMARK_PUBLIC_ORIGIN || "").trim();
  return origin || "https://dmark.is";
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api/"],
      },
    ],
    sitemap: `${publicOrigin()}/sitemap.xml`,
  };
}
