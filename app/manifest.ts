import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dmark",
    short_name: "dmark",
    description: "Open-source email security: SPF, DKIM, DMARC and BIMI checks and domain setup guidance.",
    start_url: "/is/",
    scope: "/",
    display: "standalone",
    background_color: "#0F0F0D",
    theme_color: "#F2B705",
    icons: [
      { src: "/icons/192/", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512/", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
