import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "dmark.is",
    short_name: "dmark",
    description: "Public DMARC and SPF scanner for Icelandic domains, with beta automation and reporting on request.",
    start_url: "/",
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
