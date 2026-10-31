import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";
import { CheckCta, GuideLayout } from "@/components/guide-layout";
import { CopyButton } from "@/components/fix-plan";
import { guideAlternates, guideById, guideBySlug, guideIndexCopy, guidePath, guides, guideSection, guideStructuredData, toGuideLocale, type Guide } from "@/lib/guides";
import { lastReviewed, siteURL } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return (["is", "en"] as const).flatMap((locale) => guides[locale].map((g) => ({ locale, section: guideSection[locale], slug: g.slug })));
}

type Params = { params: Promise<{ locale: string; section: string; slug: string }> };

function resolve(locale: string, section: string, slug: string): Guide | undefined {
  const l = toGuideLocale(locale);
  return section === guideSection[l] ? guideBySlug(l, slug) : undefined;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale, section, slug } = await params;
  const guide = resolve(locale, section, slug);
  if (!guide) return {};
  const l = toGuideLocale(locale);
  const image = `/social/${l}/${guide.id}/`;
  return {
    title: guide.metaTitle,
    description: guide.description,
    alternates: { canonical: guidePath(l, guide.id), languages: guideAlternates(guide.id) },
    openGraph: {
      type: "article",
      url: `${siteURL}${guidePath(l, guide.id)}`,
      siteName: "dmark",
      locale: l === "en" ? "en_GB" : "is_IS",
      title: guide.title,
      description: guide.description,
      publishedTime: lastReviewed,
      modifiedTime: lastReviewed,
      images: [{ url: image, width: 1200, height: 630, alt: guide.title }],
    },
    twitter: { card: "summary_large_image", title: guide.title, description: guide.description, images: [image] },
  };
}

export default async function GuidePage({ params }: Params) {
  const { locale, section, slug } = await params;
  const guide = resolve(locale, section, slug);
  if (!guide) notFound();
  const l = toGuideLocale(locale);
  setRequestLocale(l);
  const other = l === "en" ? "is" : "en";
  const t = (en: string, is: string) => (l === "en" ? en : is);
  const reviewed = new Intl.DateTimeFormat(l === "en" ? "en-GB" : "is-IS", { dateStyle: "long", timeZone: "UTC" }).format(new Date(lastReviewed));
  return (
    <GuideLayout locale={l} alternateHref={guidePath(other, guide.id)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(guideStructuredData(l, guide)).replace(/</g, "\\u003c") }} />
      <nav className="guide-breadcrumb" aria-label={t("Breadcrumb", "Brauðmolar")}>
        <a href={`/${l}/`}>dmark</a>
        <span aria-hidden="true">/</span>
        <a href={guidePath(l)}>{guideIndexCopy[l].title}</a>
      </nav>
      <article className="guide-article">
        <h1>{guide.title}</h1>
        <p className="guide-meta">{t(`Last reviewed ${reviewed} · Kastro`, `Síðast yfirfarið ${reviewed} · Kastro`)}</p>
        <p className="guide-answer">{guide.answer}</p>
        {guide.sections.map((s) => (
          <section key={s.heading} className="guide-section">
            <h2>{s.heading}</h2>
            {s.body?.map((p) => <p key={p}>{p}</p>)}
            {s.steps ? (
              <ol>
                {s.steps.map((step) => <li key={step}>{step}</li>)}
              </ol>
            ) : null}
            {s.records?.length ? (
              <div className="guide-records">
                {s.records.map((r) => (
                  <div className="guide-record" key={`${r.type}-${r.host}-${r.value}`}>
                    <span className="guide-record-type">{r.type}</span>
                    <span className="guide-record-field">
                      <small>{t("Name", "Nafn")}</small>
                      <code>{r.host}</code>
                    </span>
                    <span className="guide-record-field guide-record-value">
                      <small>{t("Value", "Gildi")}</small>
                      {r.fromProvider ? <em>{r.value}</em> : <code>{r.value}</code>}
                      {r.fromProvider ? null : <CopyButton value={r.value} label={t(`Copy ${r.value}`, `Afrita ${r.value}`)} />}
                    </span>
                  </div>
                ))}
                {s.records.some((r) => r.host === "@") ? (
                  <p className="guide-hint">{t("@ means the domain itself. Some DNS hosts want the name field left empty.", "@ þýðir lénið sjálft. Sumir DNS-hýsingaraðilar vilja nafnreitinn tóman.")}</p>
                ) : null}
              </div>
            ) : null}
            {s.note ? <p className="guide-note">{s.note}</p> : null}
          </section>
        ))}
        <CheckCta locale={l} />
        <section className="guide-section guide-faq" aria-labelledby="guide-faq">
          <h2 id="guide-faq">{t("Common questions", "Algengar spurningar")}</h2>
          {guide.faqs.map((f) => (
            <div key={f.question}>
              <h3>{f.question}</h3>
              <p>{f.answer}</p>
            </div>
          ))}
        </section>
        <section className="guide-section guide-related" aria-labelledby="guide-related">
          <h2 id="guide-related">{t("Related guides", "Tengdar leiðbeiningar")}</h2>
          <ul>
            {guide.related.map((id) => (
              <li key={id}><a href={guidePath(l, id)}>{guideById(l, id).title}</a></li>
            ))}
          </ul>
        </section>
        <section className="guide-section guide-sources" aria-labelledby="guide-sources">
          <h2 id="guide-sources">{t("Sources", "Heimildir")}</h2>
          <ul>
            {guide.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.label} <ExternalLink size={13} aria-hidden="true" /></a></li>
            ))}
          </ul>
        </section>
      </article>
    </GuideLayout>
  );
}
