export const siteURL = "https://dmark.is";
export const publicContent = {
  en: {
    title: "Dmark | Free SPF, DKIM & DMARC checker by Kastro",
    description: "Check SPF, DKIM, DMARC and BIMI records for free. See your domain score, follow a DNS setup guide and save progress in your browser. No account, no email.",
    heading: "Free email authentication checks from Kastro",
    intro: "Dmark checks public DNS records for SPF, DKIM, DMARC and BIMI. Add a domain to see its DNS readiness score, review findings and follow a guided setup plan. There are no accounts: your domain checklist stays in your browser.",
    faqHeading: "How Dmark works",
    help: "Dmark is a free tool from Kastro. If you want help reviewing your domain’s email configuration, contact Kastro.",
    helpLabel: "Talk to Kastro",
    shareHeading: "Understand your email security.",
    shareDescription: "Free domain checks. Clear findings. Guided setup.",
    faqs: [
      { question: "What does the domain score measure?", answer: "Five observed DNS checks are worth 20 points each: valid SPF within the 10-lookup limit; healthy SPF with fewer than eight lookups and no assessed warnings; a published DKIM key; valid DMARC; and full DMARC enforcement with p=reject, pct=100 and no assessed DMARC warnings. Incomplete checks do not receive a score. A score of 100 does not guarantee email delivery, validate DKIM signatures or prove sender alignment. Manual checkmarks and BIMI do not change the score." },
      { question: "What do SPF, DKIM, DMARC and BIMI do?", answer: "SPF publishes which servers may send mail for a domain. DKIM publishes a key used to verify signed messages; Dmark checks the DNS key record, not message signatures. DMARC checks alignment with the From domain and publishes a policy and reporting destinations. BIMI publishes brand information that supported email providers may display, subject to their logo and certificate requirements." },
      { question: "Do I need an account?", answer: "No, and you cannot create one. Dmark has no accounts by design. Your saved domains, selectors and manual checkmarks stay in a cookie in this browser, and domain scores are cached locally. Clearing the cookie removes them. Dmark does not provide continuous monitoring." },
      { question: "Does Dmark change my DNS or host SPF?", answer: "No. Dmark reads public DNS and provides guidance. You make any changes through your DNS provider. The advanced SPF generator creates an on-demand snapshot of supported dependencies. It is not hosted SPF and does not automatically update when provider IP addresses change." },
      { question: "What happens to my domain when I run a check?", answer: "The selected domain is sent to Kastro Lookup for its SPF and DMARC assessment, and public DNS is queried for DKIM and BIMI records. Your saved domain checklist stays in a browser cookie, and check results are not saved on Dmark’s servers. Domain names are excluded from Dmark’s custom analytics events." },
      { question: "Why might a DKIM key not be found?", answer: "A domain can use a custom DKIM selector that common-selector discovery does not find. Enter the selector supplied by your email provider, or the s= value from a DKIM-Signature header, and recheck. An undiscovered key does not prove DKIM is missing. Verify real email from every sending service before increasing DMARC enforcement." },
    ],
  },
  is: {
    title: "Dmark | Ókeypis SPF, DKIM og DMARC athugun frá Kastro",
    description: "Athugaðu SPF, DKIM, DMARC og BIMI færslur ókeypis. Sjáðu stig lénsins, fáðu leiðsögn um DNS stillingar og vistaðu yfirferð í vafranum. Enginn aðgangur, ekkert netfang.",
    heading: "Ókeypis athugun á tölvupóststillingum frá Kastro",
    intro: "Dmark athugar opinberar DNS færslur fyrir SPF, DKIM, DMARC og BIMI. Bættu við léni til að sjá stig þess, skoða niðurstöður og fylgja leiðsögn um uppsetningu. Engir aðgangar eru til: gátlistinn þinn er geymdur í vafranum þínum.",
    faqHeading: "Svona virkar Dmark",
    help: "Dmark er ókeypis tól frá Kastro. Hafðu samband við Kastro ef þú vilt aðstoð við að yfirfara tölvupóststillingar lénsins.",
    helpLabel: "Hafa samband við Kastro",
    shareHeading: "Yfirsýn yfir tölvupóstöryggi.",
    shareDescription: "Ókeypis lénaskoðun. Skýrar niðurstöður. Leiðsögn.",
    faqs: [
      { question: "Hvað segja stig lénsins mér?", answer: "Fimm DNS athuganir gefa 20 stig hver: gilt SPF innan 10 uppflettinga marksins; SPF með færri en átta uppflettingum og engum viðvörunum í matinu; birtur DKIM lykill; gilt DMARC; og full DMARC framfylgd með p=reject, pct=100 og engum DMARC viðvörunum í matinu. Óloknar athuganir fá ekki stig. 100 stig tryggja hvorki afhendingu pósts né staðfesta DKIM undirritun eða samsvörun sendanda. Handvirk hök og BIMI breyta ekki stigunum." },
      { question: "Til hvers eru SPF, DKIM, DMARC og BIMI?", answer: "SPF tilgreinir hvaða netþjónar mega senda póst fyrir lén. DKIM birtir lykil til að sannreyna undirritaðan póst; Dmark athugar DNS lykilfærsluna, ekki undirritun skilaboða. DMARC athugar samsvörun við lénið í From hausnum og birtir stefnu og skýrslumóttakendur. BIMI birtir upplýsingar um vörumerki sem studdar póstveitur geta sýnt, að uppfylltum kröfum þeirra um merki og vottorð." },
      { question: "Þarf ég að stofna aðgang?", answer: "Nei, og það er ekki hægt. Dmark er viljandi án aðganga. Vistuð lén, DKIM selectors og handvirk hök geymast í vafraköku í þessum vafra og stig léna eru vistuð staðbundið. Ef þú eyðir kökunni hverfa þau. Dmark veitir ekki stöðuga vöktun." },
      { question: "Breytir Dmark DNS færslunum mínum eða hýsir SPF?", answer: "Nei. Dmark les opinberar DNS færslur og veitir leiðsögn. Þú gerir breytingar hjá DNS veitandanum þínum. Ítarlegi SPF valkosturinn býr til stöðumynd af studdum tilvísunum eftir þörfum. Þetta er ekki hýst SPF og færsla uppfærist ekki sjálfkrafa þegar IP svið veitenda breytast." },
      { question: "Hvað verður um lénið mitt þegar ég athuga það?", answer: "Valið lén er sent til Kastro Lookup fyrir SPF og DMARC mat og opinberar DNS færslur eru sóttar fyrir DKIM og BIMI. Vistuð yfirferð lénsins er geymd í vafraköku og niðurstöður athugana eru ekki vistaðar á netþjónum Dmark. Lénsheiti eru ekki send í sérsniðnum greiningarviðburðum Dmark." },
      { question: "Af hverju finnst DKIM lykillinn ekki?", answer: "Lén getur notað sérsniðinn DKIM selector sem leit að algengum selectors finnur ekki. Sláðu inn selector frá póstveitandanum eða s= gildið úr DKIM-Signature haus og athugaðu aftur. Lykill sem finnst ekki sannar ekki að DKIM vanti. Staðfestu raunverulegan póst frá öllum sendiþjónustum áður en þú herðir DMARC framfylgd." },
    ],
  },
} as const;

export function contentForLocale(locale: string) {
  return publicContent[locale === "en" ? "en" : "is"];
}

export function publicStructuredData(locale: string) {
  const language = locale === "en" ? "en" : "is";
  const content = contentForLocale(language);
  const url = `${siteURL}/${language}/`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://kastro.is/#organization", name: "Kastro", url: "https://kastro.is/", logo: `${siteURL}/brand/kastro/star-yellow.png` },
      { "@type": "WebSite", "@id": `${siteURL}/#website`, name: "Dmark by Kastro", url: siteURL, inLanguage: ["is", "en"], publisher: { "@id": "https://kastro.is/#organization" } },
      { "@type": "WebApplication", "@id": `${siteURL}/#app`, name: "Dmark", url, description: content.intro, applicationCategory: "SecurityApplication", operatingSystem: "Web browser", inLanguage: ["is", "en"], isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "ISK" }, publisher: { "@id": "https://kastro.is/#organization" } },
      { "@type": "FAQPage", "@id": `${url}#about-dmark`, url, inLanguage: language, isPartOf: { "@id": `${siteURL}/#website` }, about: { "@id": `${siteURL}/#app` }, mainEntity: content.faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  };
}
