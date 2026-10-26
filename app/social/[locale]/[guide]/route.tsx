import { guideById, guides, guideSection, type GuideId } from "@/lib/guides";
import { socialCard } from "@/lib/social-card";

export const runtime = "nodejs";
export const dynamic = "force-static";
export function generateStaticParams() {
  return (["is", "en"] as const).flatMap((locale) => guides[locale].map((g) => ({ locale, guide: g.id })));
}

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; guide: string }> }) {
  const { locale, guide: id } = await params;
  if ((locale !== "is" && locale !== "en") || !guides[locale].some((g) => g.id === id)) return new Response("Not found", { status: 404 });
  const guide = guideById(locale, id as GuideId);
  return socialCard({
    locale,
    eyebrow: locale === "en" ? "Guide" : "Leiðbeiningar",
    heading: guide.title,
    sub: guide.description.replace(/\s*(Free check at|Ókeypis athugun á) dmark\.is\.$/, ""),
    footer: `dmark.is/${locale}/${guideSection[locale]}`,
  });
}
