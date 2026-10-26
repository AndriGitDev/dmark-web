import type { MetadataRoute } from "next";
import { siteURL } from "@/lib/site";

export const dynamic = "force-static";

/** Search and AI assistants may read everything public; only API routes are off limits. */
const AI_CRAWLERS = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      { userAgent: AI_CRAWLERS, allow: ["/", "/llms.txt"], disallow: ["/api/"] },
    ],
    host: siteURL,
    sitemap: `${siteURL}/sitemap.xml`,
  };
}
