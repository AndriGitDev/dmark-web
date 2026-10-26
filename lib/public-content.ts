import { kastroOrganization, siteURL } from "./site";
export { siteURL };
export const publicContent = {
  en: {
    title: "Free DMARC, SPF and DKIM checker in plain language | dmark",
    ogTitle: "Is your email protected?",
    description: "Check for free whether someone can send fake email as your domain, then get the exact DMARC, SPF and DKIM records to fix it. No account, no email address.",
    heading: "Free email authentication checks from Kastro",
    intro: "Dmark checks public DNS records for SPF, DKIM, DMARC and BIMI. Enter a domain to see whether someone can send email pretending to be you, then follow a step-by-step fix with the exact records for your email provider. There are no accounts: your saved domains stay in your browser.",
    faqHeading: "How Dmark works",
    help: "Dmark is a free tool from Kastro. If you want help reviewing your domain’s email configuration, contact Kastro.",
    helpLabel: "Talk to Kastro",
    shareHeading: "Is your email protected?",
    shareDescription: "Free check in two seconds. Exact records to fix it. No sign-up.",
    faqs: [
      { question: "What does the result mean?", answer: "Not protected means DMARC is missing or only monitoring, so anyone can send email that looks like it comes from your domain. Partly protected means fake email goes to spam. Protected means receivers reject it outright. The steps show exactly which records to add, in a safe order. The result describes your public DNS settings, not whether every email you send is delivered." },
      { question: "What do SPF, DKIM, DMARC and BIMI do?", answer: "SPF publishes which servers may send mail for a domain. DKIM publishes a key used to verify signed messages; Dmark checks the DNS key record, not message signatures. DMARC checks alignment with the From domain and publishes a policy and reporting destinations. BIMI publishes brand information that supported email providers may display, subject to their logo and certificate requirements." },
      { question: "Do I need an account?", answer: "No, and you cannot create one. Dmark has no accounts by design. Your saved domains and DKIM selectors stay in a cookie in this browser, and the latest results are cached locally. Clearing the cookie removes them. Dmark does not provide continuous monitoring." },
      { question: "Does Dmark change my DNS or host SPF?", answer: "No. Dmark reads public DNS and provides guidance. You make any changes through your DNS provider. The advanced SPF generator creates an on-demand snapshot of supported dependencies. It is not hosted SPF and does not automatically update when provider IP addresses change." },
      { question: "What happens to my domain when I run a check?", answer: "The selected domain is sent to Kastro Lookup for its SPF and DMARC assessment, and public DNS is queried for DKIM and BIMI records. Your saved domains stay in a browser cookie, and check results are not saved on Dmark’s servers. Domain names are excluded from Dmark’s custom analytics events." },
      { question: "Why might a DKIM key not be found?", answer: "A domain can use a custom DKIM selector that common-selector discovery does not find. Enter the selector supplied by your email provider, or the s= value from a DKIM-Signature header, and recheck. An undiscovered key does not prove DKIM is missing. Verify real email from every sending service before increasing DMARC enforcement." },
    ],
  },
  is: {
    title: "Ókeypis DMARC, SPF og DKIM athugun á mannamáli | dmark",
    ogTitle: "Er tölvupósturinn þinn varinn?",
    description: "Athugaðu ókeypis hvort hægt sé að senda falsaðan póst í nafni lénsins þíns og fáðu nákvæmar DMARC, SPF og DKIM færslur til að laga það. Engin skráning, ekkert netfang.",
    heading: "Ókeypis athugun á tölvupóststillingum frá Kastro",
    intro: "Dmark athugar opinberar DNS færslur fyrir SPF, DKIM, DMARC og BIMI. Sláðu inn lén til að sjá hvort hægt sé að senda póst í þínu nafni og fylgdu síðan skref-fyrir-skref lagfæringu með nákvæmum færslum fyrir þína póstþjónustu. Engir aðgangar eru til: vistuð lén eru geymd í vafranum þínum.",
    faqHeading: "Svona virkar Dmark",
    help: "Dmark er ókeypis tól frá Kastro. Hafðu samband við Kastro ef þú vilt aðstoð við að yfirfara tölvupóststillingar lénsins.",
    helpLabel: "Hafa samband við Kastro",
    shareHeading: "Er tölvupósturinn þinn varinn?",
    shareDescription: "Ókeypis athugun á tveimur sekúndum. Nákvæmar færslur til að laga. Engin skráning.",
    faqs: [
      { question: "Hvað þýðir niðurstaðan?", answer: "Óvarið þýðir að DMARC vantar eða er aðeins í eftirliti, svo hver sem er getur sent póst sem lítur út fyrir að koma frá léninu. Að hluta varið þýðir að falsaður póstur fer í ruslpóst. Varið þýðir að póstþjónar hafna honum alveg. Skrefin sýna nákvæmlega hvaða færslum á að bæta við, í öruggri röð. Niðurstaðan lýsir opinberum DNS-stillingum, ekki því hvort allur póstur frá ykkur berist." },
      { question: "Til hvers eru SPF, DKIM, DMARC og BIMI?", answer: "SPF tilgreinir hvaða netþjónar mega senda póst fyrir lén. DKIM birtir lykil til að sannreyna undirritaðan póst; Dmark athugar DNS lykilfærsluna, ekki undirritun skilaboða. DMARC athugar samsvörun við lénið í From hausnum og birtir stefnu og skýrslumóttakendur. BIMI birtir upplýsingar um vörumerki sem studdar póstveitur geta sýnt, að uppfylltum kröfum þeirra um merki og vottorð." },
      { question: "Þarf ég að stofna aðgang?", answer: "Nei, og það er ekki hægt. Dmark er viljandi án aðganga. Vistuð lén og DKIM selectors geymast í vafraköku í þessum vafra og nýjustu niðurstöður eru vistaðar staðbundið. Ef þú eyðir kökunni hverfa þau. Dmark veitir ekki stöðuga vöktun." },
      { question: "Breytir Dmark DNS færslunum mínum eða hýsir SPF?", answer: "Nei. Dmark les opinberar DNS færslur og veitir leiðsögn. Þú gerir breytingar hjá DNS veitandanum þínum. Ítarlegi SPF valkosturinn býr til stöðumynd af studdum tilvísunum eftir þörfum. Þetta er ekki hýst SPF og færsla uppfærist ekki sjálfkrafa þegar IP svið veitenda breytast." },
      { question: "Hvað verður um lénið mitt þegar ég athuga það?", answer: "Valið lén er sent til Kastro Lookup fyrir SPF og DMARC mat og opinberar DNS færslur eru sóttar fyrir DKIM og BIMI. Vistuð lén eru geymd í vafraköku og niðurstöður athugana eru ekki vistaðar á netþjónum Dmark. Lénsheiti eru ekki send í sérsniðnum greiningarviðburðum Dmark." },
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
      kastroOrganization,
      { "@type": "WebSite", "@id": `${siteURL}/#website`, name: "Dmark by Kastro", url: siteURL, inLanguage: ["is", "en"], publisher: { "@id": "https://kastro.is/#organization" } },
      { "@type": "WebApplication", "@id": `${siteURL}/#app`, name: "Dmark", url, description: content.intro, applicationCategory: "SecurityApplication", operatingSystem: "Web browser", inLanguage: ["is", "en"], isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "ISK" }, publisher: { "@id": "https://kastro.is/#organization" } },
      { "@type": "FAQPage", "@id": `${url}#about-dmark`, url, inLanguage: language, isPartOf: { "@id": `${siteURL}/#website` }, about: { "@id": `${siteURL}/#app` }, mainEntity: content.faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) },
    ],
  };
}
