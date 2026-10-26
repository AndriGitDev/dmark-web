import { contentForLocale } from "@/lib/public-content";
import { socialCard } from "@/lib/social-card";

export const runtime = "nodejs";
export const dynamic = "force-static";
export function generateStaticParams() { return [{ locale: "is" }, { locale: "en" }]; }

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "is" && locale !== "en") return new Response("Not found", { status: 404 });
  const content = contentForLocale(locale);
  return socialCard({ locale, eyebrow: "SPF · DKIM · DMARC", heading: content.shareHeading, sub: content.shareDescription, footer: "dmark.is", showVerdict: true });
}
