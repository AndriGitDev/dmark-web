import type { ReactNode } from "react";
import Image from "next/image";
import kastroYellow from "@/public/brand/kastro/star-yellow.png";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { guidePath, toGuideLocale } from "@/lib/guides";

const copy = {
  is: { check: "Athuga lén", guides: "Leiðbeiningar", other: "English", privacy: "Persónuvernd", terms: "Skilmálar", contact: "Hafa samband", free: "Ókeypis tölvupóstöryggi frá Kastro", skip: "Fara í efni" },
  en: { check: "Check a domain", guides: "Guides", other: "Íslenska", privacy: "Privacy", terms: "Terms", contact: "Contact", free: "Free email security by Kastro", skip: "Skip to content" },
} as const;

/** Static, crawlable shell for guide pages: no client state, plain links. */
export function GuideLayout({ locale, alternateHref, children }: { locale: string; alternateHref: string; children: ReactNode }) {
  const l = toGuideLocale(locale);
  const c = copy[l];
  return (
    <div className="guide-shell">
      <a className="skip-link" href="#guide-content">{c.skip}</a>
      <header className="guide-header">
        <a className="guide-logo" href={`/${l}/`} aria-label="dmark">
          <Image src={kastroYellow} alt="" aria-hidden="true" width={30} height={28} />
          <span>dmark<span>.</span></span>
        </a>
        <nav aria-label={c.guides}>
          <a href={guidePath(l)}>{c.guides}</a>
          <a href={alternateHref} hrefLang={l === "en" ? "is" : "en"} lang={l === "en" ? "is" : "en"}>{c.other}</a>
          <a className="app-button compact" href={`/${l}/`}>{c.check}</a>
        </nav>
      </header>
      <main id="guide-content" className="guide-main">{children}</main>
      <footer className="app-footer guide-footer">
        <span>{c.free}</span>
        <nav aria-label={c.free}>
          <a href={`https://kastro.is/${l}/privacy`}>{c.privacy}</a>
          <a href={`https://kastro.is/${l}/terms`}>{c.terms}</a>
          <a href={`https://kastro.is/${l}/contact`}>{c.contact}</a>
        </nav>
      </footer>
    </div>
  );
}

export function CheckCta({ locale }: { locale: string }) {
  const l = toGuideLocale(locale);
  return (
    <aside className="guide-cta">
      <ShieldCheck size={28} aria-hidden="true" />
      <div>
        <h2>{l === "en" ? "Is your domain protected?" : "Er lénið þitt varið?"}</h2>
        <p>
          {l === "en"
            ? "Check it for free in about two seconds. You get a plain answer and the exact records for your email provider. No sign-up."
            : "Athugaðu það ókeypis á um tveimur sekúndum. Þú færð skýrt svar og nákvæmar færslur fyrir þína póstþjónustu. Engin skráning."}
        </p>
      </div>
      <a className="app-button" href={`/${l}/`}>
        {l === "en" ? "Check my domain" : "Athuga lénið mitt"}
        <ArrowRight size={16} aria-hidden="true" />
      </a>
    </aside>
  );
}
