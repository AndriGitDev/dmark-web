import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { CheckCta, GuideLayout } from "@/components/guide-layout";
import { guideAlternates, guideIndexCopy, guidePath, guides, guideSection, toGuideLocale } from "@/lib/guides";
import { kastroOrganization, siteURL } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return (["is", "en"] as const).map((locale) => ({ locale, section: guideSection[locale] }));
}

type Params = { params: Promise<{ locale: string; section: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const l = toGuideLocale(locale);
  const copy = guideIndexCopy[l];
  return {
    title: copy.metaTitle,
    description: copy.description,
    alternates: { canonical: guidePath(l), languages: guideAlternates() },
    openGraph: {
      type: "website",
      url: `${siteURL}${guidePath(l)}`,
      siteName: "dmark by Kastro",
      locale: l === "en" ? "en_GB" : "is_IS",
      title: copy.title,
      description: copy.description,
      images: [{ url: `/social/${l}/`, width: 1200, height: 630, alt: copy.title }],
    },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description, images: [`/social/${l}/`] },
  };
}

export default async function GuideIndex({ params }: Params) {
  const { locale, section } = await params;
  const l = toGuideLocale(locale);
  if (section !== guideSection[l]) notFound();
  setRequestLocale(l);
  const copy = guideIndexCopy[l];
  const list = guides[l];
  const jsonld = {
    "@context": "https://schema.org",
    "@graph": [
      kastroOrganization,
      {
        "@type": "CollectionPage",
        "@id": `${siteURL}${guidePath(l)}#page`,
        name: copy.title,
        description: copy.description,
        url: `${siteURL}${guidePath(l)}`,
        inLanguage: l,
        publisher: { "@id": kastroOrganization["@id"] },
        mainEntity: {
          "@type": "ItemList",
          itemListElement: list.map((g, i) => ({ "@type": "ListItem", position: i + 1, name: g.title, url: `${siteURL}${guidePath(l, g.id)}` })),
        },
      },
    ],
  };
  const section_ = (kind: "provider" | "concept", heading: string) => (
    <section className="guide-list" aria-labelledby={`guides-${kind}`}>
      <h2 id={`guides-${kind}`}>{heading}</h2>
      <ul>
        {list.filter((g) => g.kind === kind).map((g) => (
          <li key={g.id}>
            <a href={guidePath(l, g.id)}>
              <strong>{g.title}</strong>
              <span>{g.description}</span>
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
  return (
    <GuideLayout locale={l} alternateHref={guidePath(l === "en" ? "is" : "en")}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonld).replace(/</g, "\\u003c") }} />
      <p className="app-eyebrow">dmark / {l === "en" ? "Guides" : "Leiðbeiningar"}</p>
      <h1>{copy.title}</h1>
      <p className="guide-answer">{copy.intro}</p>
      {section_("provider", copy.providers)}
      {section_("concept", copy.concepts)}
      <CheckCta locale={l} />
    </GuideLayout>
  );
}
