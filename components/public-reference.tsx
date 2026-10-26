import { contentForLocale } from "@/lib/public-content";
import { guideIndexCopy, guidePath, guides, toGuideLocale } from "@/lib/guides";

export function PublicReference({ locale }: { locale: string }) {
  const content = contentForLocale(locale);
  return (
    <section id="about-dmark" className="public-reference" aria-labelledby="about-dmark-heading">
      <p className="app-eyebrow">Dmark / Kastro</p>
      <h2 id="about-dmark-heading">{content.heading}</h2>
      <p className="reference-intro">{content.intro}</p>
      <h3>{guideIndexCopy[toGuideLocale(locale)].title}</h3>
      <ul className="reference-guides">
        {guides[toGuideLocale(locale)].map((g) => (
          <li key={g.id}><a href={guidePath(locale, g.id)}>{g.title}</a></li>
        ))}
      </ul>
      <h3>{content.faqHeading}</h3>
      <div className="reference-faqs">
        {content.faqs.map(({ question, answer }) => (
          <details key={question}>
            <summary>{question}</summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
      <p className="reference-help">{content.help} <a href={`https://kastro.is/${locale === "en" ? "en" : "is"}/contact`} target="_blank" rel="noreferrer">{content.helpLabel} ↗</a></p>
    </section>
  );
}
