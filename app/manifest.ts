import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dmark.is",
    short_name: "dmark",
    description: "Free SPF, DKIM, DMARC and BIMI checks and domain setup guidance from Kastro.",
    start_url: "/is/",
    scope: "/",
    display: "standalone",
    background_color: "#F4F8FA",
    theme_color: "#44B6CD",
    icons: [
      {
        src: "/brand/dmark-icon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}

