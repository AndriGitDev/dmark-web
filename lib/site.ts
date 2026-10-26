/** Canonical origin. The apex dmark.is redirects here, so every public URL must use it. */
export const siteURL = "https://www.dmark.is";
export const siteName = "dmark by Kastro";
export const lastReviewed = "2026-10-26";
export const kastroOrganization = {
  "@type": "Organization",
  "@id": "https://kastro.is/#organization",
  name: "Kastro",
  url: "https://kastro.is/",
  logo: `${siteURL}/brand/kastro/star-yellow.png`,
} as const;
