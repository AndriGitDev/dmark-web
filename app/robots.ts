import type { MetadataRoute } from "next";
import { siteURL } from "@/lib/site";

export const dynamic = "force-static";

/** Public content is available to all crawlers; API routes are excluded. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
    ],
    host: siteURL,
    sitemap: `${siteURL}/sitemap.xml`,
  };
}
