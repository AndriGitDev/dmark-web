import { kastroOrganization, lastReviewed, siteURL } from "./site";

export type GuideLocale = "is" | "en";
export type GuideId = "microsoft-365" | "google-workspace" | "no-email" | "dmarc" | "spf" | "dkim";

export type GuideRecord = { type: "TXT" | "CNAME" | "MX"; host: string; value: string; fromProvider?: boolean };
export type GuideSection = { heading: string; body?: string[]; steps?: string[]; records?: GuideRecord[]; note?: string };
export type GuideFaq = { question: string; answer: string };
export type GuideSource = { label: string; url: string };

export type Guide = {
  id: GuideId;
  slug: string;
  kind: "provider" | "concept";
  title: string;
  metaTitle: string;
  description: string;
  /** Answer-first summary: the sentence a search snippet or AI answer should quote. */
  answer: string;
  sections: GuideSection[];
  faqs: GuideFaq[];
  sources: GuideSource[];
  related: GuideId[];
};

/** Guides live under a localized section path. */
export const guideSection: Record<GuideLocale, string> = { is: "leidbeiningar", en: "guides" };
export const guideIndexCopy = {
  is: {
    title: "Leiðbeiningar um tölvupóstöryggi",
    metaTitle: "Leiðbeiningar: DMARC, SPF og DKIM á mannamáli | dmark",
    description: "Skref-fyrir-skref leiðbeiningar með nákvæmum DNS-færslum til að verja lénið þitt gegn fölsuðum pósti. Microsoft 365, Google Workspace og fleira.",
    intro: "Veldu leiðbeiningar fyrir þína póstþjónustu eða lestu um hvað SPF, DKIM og DMARC gera. Ef þú vilt vita hvar lénið þitt stendur núna skaltu byrja á ókeypis athugun.",
    providers: "Eftir póstþjónustu",
    concepts: "Hvað þýða hugtökin?",
  },
  en: {
    title: "Email security guides",
    metaTitle: "Guides: DMARC, SPF and DKIM in plain language | dmark",
    description: "Step-by-step guides with exact DNS records to protect your domain from email spoofing. Microsoft 365, Google Workspace and more.",
    intro: "Pick the guide for your email provider, or read what SPF, DKIM and DMARC actually do. To see where your domain stands right now, start with a free check.",
    providers: "By email provider",
    concepts: "What the terms mean",
  },
} as const;

const MS_SPF: GuideSource = { label: "Microsoft Learn: Set up SPF", url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-spf-configure" };
const MS_DKIM: GuideSource = { label: "Microsoft Learn: Set up DKIM", url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure" };
const G_DKIM: GuideSource = { label: "Google Workspace Admin Help: Set up DKIM", url: "https://support.google.com/a/answer/174124" };
const G_SPF: GuideSource = { label: "Google Workspace Admin Help: Set up SPF", url: "https://support.google.com/a/answer/33786" };
const RFC_DMARC: GuideSource = { label: "RFC 7489: DMARC", url: "https://www.rfc-editor.org/rfc/rfc7489" };
const RFC_SPF: GuideSource = { label: "RFC 7208: SPF", url: "https://www.rfc-editor.org/rfc/rfc7208" };
const RFC_DKIM: GuideSource = { label: "RFC 6376: DKIM", url: "https://www.rfc-editor.org/rfc/rfc6376" };
const RFC_NULLMX: GuideSource = { label: "RFC 7505: Null MX", url: "https://www.rfc-editor.org/rfc/rfc7505" };

const IS: Guide[] = [
  {
    id: "microsoft-365",
    slug: "microsoft-365",
    kind: "provider",
    title: "DMARC, SPF og DKIM fyrir Microsoft 365",
    metaTitle: "DMARC, SPF og DKIM fyrir Microsoft 365: skref fyrir skref | dmark",
    description: "Nákvæmar DNS-færslur og skref til að verja lén sem notar Microsoft 365 gegn fölsuðum pósti. Ókeypis athugun á dmark.is.",
    answer:
      "Til að verja lén sem notar Microsoft 365 þarf þrennt: SPF-færsluna v=spf1 include:spf.protection.outlook.com -all, tvær DKIM CNAME-færslur (selector1 og selector2) sem Microsoft Defender gefur upp, og DMARC-færslu á _dmarc. Byrjaðu DMARC á p=none og hertu svo í p=quarantine og loks p=reject þegar allur póstur stenst.",
    sections: [
      {
        heading: "1. SPF: segðu hver má senda",
        body: ["Microsoft mælir með -all fyrir lén sem senda aðeins í gegnum Microsoft 365, þegar DKIM og DMARC eru líka sett upp."],
        records: [{ type: "TXT", host: "@", value: "v=spf1 include:spf.protection.outlook.com -all" }],
        note: "Ef aðrar þjónustur senda líka póst í ykkar nafni, til dæmis reikningakerfi eða fréttabréf, bættu þeim við í sömu færslu. Það má aðeins vera ein SPF-færsla á léninu.",
      },
      {
        heading: "2. DKIM: kveiktu á undirritun",
        steps: [
          "Opnaðu security.microsoft.com/authentication og veldu DKIM flipann.",
          "Smelltu á lénið. Microsoft sýnir tvær CNAME-færslur sem þarf að bæta við.",
          "Bættu báðum við hjá DNS-hýsingaraðilanum. Settu aðeins host-hlutann í nafnreitinn, til dæmis selector1._domainkey.",
          "Farðu aftur í Defender og kveiktu á „Sign messages for this domain with DKIM signatures“.",
        ],
        records: [
          { type: "CNAME", host: "selector1._domainkey", value: "(gildið sem Microsoft sýnir)", fromProvider: true },
          { type: "CNAME", host: "selector2._domainkey", value: "(gildið sem Microsoft sýnir)", fromProvider: true },
        ],
        note: "Gildin eru einstök fyrir hvert lén, svo afritaðu þau beint úr Defender. Ef DNS er hjá Cloudflare þarf að stilla færslurnar á „DNS only“.",
      },
      {
        heading: "3. DMARC: byrjaðu í eftirliti",
        body: ["p=none stöðvar engan póst. Þetta er öruggur fyrsti áfangi á meðan þú staðfestir að allur lögmætur póstur standist."],
        records: [{ type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" }],
      },
      {
        heading: "4. Hertu DMARC í áföngum",
        body: [
          "Sendu prufupóst frá öllu sem sendir póst í ykkar nafni: venjulegum pósti, reikningakerfi, vefverslun, fréttabréfum og vefformum. Þegar allt berst eðlilega skaltu breyta í p=quarantine. Eftir viku eða tvær án vandræða skaltu fara í p=reject.",
        ],
        records: [
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=quarantine;" },
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=reject;" },
        ],
      },
    ],
    faqs: [
      {
        question: "Á ég að nota -all eða ~all fyrir Microsoft 365?",
        answer: "Microsoft mælir með -all þegar DKIM og DMARC eru líka sett upp, því þá getur DMARC brugðist við pósti sem stenst ekki SPF og er án DKIM-undirskriftar.",
      },
      {
        question: "Af hverju finnur Microsoft ekki CNAME-færslurnar?",
        answer: "Algengast er að allt nafnið hafi verið sett í host-reitinn svo lénið endurtekur sig, eða að Cloudflare proxy sé á. Notaðu aðeins selector1._domainkey og selector2._domainkey og stilltu á DNS only. DNS-breytingar geta tekið allt að 48 klukkustundir.",
      },
      {
        question: "Hversu langan tíma tekur þetta?",
        answer: "Færslurnar sjálfar taka nokkrar mínútur. Gefðu þér síðan viku eða tvær á p=none og p=quarantine áður en þú ferð í p=reject.",
      },
    ],
    sources: [MS_SPF, MS_DKIM, RFC_DMARC],
    related: ["dmarc", "spf", "dkim"],
  },
  {
    id: "google-workspace",
    slug: "google-workspace",
    kind: "provider",
    title: "DMARC, SPF og DKIM fyrir Google Workspace",
    metaTitle: "DMARC, SPF og DKIM fyrir Google Workspace: skref fyrir skref | dmark",
    description: "Nákvæmar DNS-færslur og skref til að verja lén sem notar Google Workspace (Gmail) gegn fölsuðum pósti. Ókeypis athugun á dmark.is.",
    answer:
      "Lén sem nota Google Workspace þurfa SPF-færsluna v=spf1 include:_spf.google.com ~all, DKIM-lykil sem búinn er til í Google Admin og settur inn sem TXT-færsla á google._domainkey, og DMARC-færslu á _dmarc. Byrjaðu DMARC á p=none og hertu svo í p=quarantine og loks p=reject.",
    sections: [
      {
        heading: "1. SPF: segðu hver má senda",
        records: [{ type: "TXT", host: "@", value: "v=spf1 include:_spf.google.com ~all" }],
        note: "Ef aðrar þjónustur senda líka póst í ykkar nafni, bættu þeim við í sömu færslu. Það má aðeins vera ein SPF-færsla á léninu.",
      },
      {
        heading: "2. DKIM: búðu til lykil í Google Admin",
        steps: [
          "Í Google Admin console: Apps > Google Workspace > Gmail > Authenticate email.",
          "Veldu lénið og smelltu á „Generate new record“. Veldu 2048 bita og haltu forskeytinu google.",
          "Afritaðu TXT-gildið sem Google sýnir (það byrjar á v=DKIM1) í nýja TXT-færslu á google._domainkey.",
          "Bíddu þar til færslan hefur dreifst og smelltu svo á „Start authentication“ í Google Admin.",
        ],
        records: [{ type: "TXT", host: "google._domainkey", value: "(gildið sem Google sýnir, byrjar á v=DKIM1)", fromProvider: true }],
        note: "Ef Gmail var nýlega virkjað getur Google þurft 24 til 72 klukkustundir áður en hægt er að búa til lykilinn, og allt að 48 klukkustundir þar til DKIM fer í gang.",
      },
      {
        heading: "3. DMARC: byrjaðu í eftirliti",
        body: ["p=none stöðvar engan póst. Þetta er öruggur fyrsti áfangi á meðan þú staðfestir að allur lögmætur póstur standist."],
        records: [{ type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" }],
      },
      {
        heading: "4. Hertu DMARC í áföngum",
        body: [
          "Sendu prufupóst frá öllu sem sendir póst í ykkar nafni. Þegar allt berst eðlilega skaltu breyta í p=quarantine. Eftir viku eða tvær án vandræða skaltu fara í p=reject.",
        ],
        records: [
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=quarantine;" },
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=reject;" },
        ],
      },
    ],
    faqs: [
      {
        question: "Hvaða SPF-færslu notar Google Workspace?",
        answer: "v=spf1 include:_spf.google.com ~all. Ef aðrar þjónustur senda líka póst í ykkar nafni skaltu bæta þeim í sömu færslu í stað þess að búa til aðra.",
      },
      {
        question: "Hvernig staðfesti ég að DKIM virki?",
        answer: "Sendu póst á Gmail-netfang hjá einhverjum öðrum (ekki sjálfum þér) og skoðaðu Authentication-Results í hausnum. Þar á að standa dkim=pass.",
      },
      {
        question: "Af hverju virkar DKIM ekki strax?",
        answer: "DNS-breytingar geta tekið allt að 48 klukkustundir. Mundu líka að smella á „Start authentication“ í Google Admin eftir að færslan er komin inn.",
      },
    ],
    sources: [G_SPF, G_DKIM, RFC_DMARC],
    related: ["dmarc", "spf", "dkim"],
  },
  {
    id: "no-email",
    slug: "len-sem-sendir-ekki-post",
    kind: "provider",
    title: "Læstu léni sem sendir ekki tölvupóst",
    metaTitle: "Læstu léni sem sendir ekki póst: tvær DNS-færslur | dmark",
    description: "Ónotuð lén eru vinsæl hjá svikurum. Tvær DNS-færslur koma í veg fyrir að hægt sé að senda póst í nafni lénsins. Ókeypis athugun á dmark.is.",
    answer:
      "Lén sem hefur engin pósthólf og sendir engan póst má læsa með tveimur TXT-færslum: v=spf1 -all á léninu sjálfu og v=DMARC1; p=reject; á _dmarc. Þá hafna póstþjónar öllum pósti sem þykist koma frá léninu.",
    sections: [
      {
        heading: "Færslurnar",
        records: [
          { type: "TXT", host: "@", value: "v=spf1 -all" },
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=reject;" },
        ],
        note: "Ef SPF- eða DMARC-færsla er þegar til skaltu skipta henni út í stað þess að bæta við annarri.",
      },
      {
        heading: "Áður en þú læsir",
        body: [
          "Gakktu úr skugga um að ekkert sendi póst í nafni lénsins: vefform, vefverslun, reikningakerfi, fréttabréf eða tæki eins og prentarar. Ef eitthvað gerir það skaltu fylgja leiðbeiningum fyrir þína póstþjónustu í staðinn.",
        ],
      },
      {
        heading: "Valfrjálst: null MX",
        body: ["Til að segja líka að lénið taki ekki á móti pósti má setja MX-færslu með forgangi 0 og gildinu „.“ (punktur), samkvæmt RFC 7505. Ekki allir DNS-hýsingaraðilar styðja það."],
        records: [{ type: "MX", host: "@", value: "0 ." }],
      },
    ],
    faqs: [
      {
        question: "Á ég að læsa lénum sem ég nota ekki fyrir póst?",
        answer: "Já. Svikarar velja oft ónotuð lén og gömul vörumerki því þar er engin vörn. Læsingin kostar ekkert og hefur engin áhrif ef enginn póstur er sendur.",
      },
      {
        question: "Hvað ef ég byrja seinna að nota lénið fyrir póst?",
        answer: "Þá skiptir þú SPF-færslunni út fyrir færslu póstþjónustunnar, fjarlægir null MX ef þú settir hana og byrjar DMARC aftur á p=none.",
      },
    ],
    sources: [RFC_SPF, RFC_DMARC, RFC_NULLMX],
    related: ["dmarc", "spf"],
  },
  {
    id: "dmarc",
    slug: "hvad-er-dmarc",
    kind: "concept",
    title: "Hvað er DMARC?",
    metaTitle: "Hvað er DMARC? Útskýrt á mannamáli | dmark",
    description: "DMARC segir póstþjónum hvað á að gera við falsaðan póst í nafni lénsins þíns. Hvernig það virkar, hvaða stefnu á að velja og hvernig á að byrja.",
    answer:
      "DMARC er DNS-færsla sem segir póstþjónum hvað á að gera við póst sem þykist koma frá léninu þínu en stenst ekki SPF eða DKIM. Hún er TXT-færsla á _dmarc.lénið og stefnan getur verið p=none (eftirlit), p=quarantine (í ruslpóst) eða p=reject (hafnað).",
    sections: [
      {
        heading: "Hvernig DMARC virkar",
        body: [
          "Þegar póstur berst athugar móttakandinn hvort hann standist SPF eða DKIM og hvort það lén passi við lénið í From-línunni sem viðtakandinn sér. Ef annað hvort stenst með samsvarandi léni stenst DMARC.",
          "Ef pósturinn stenst ekki fer stefnan í DMARC-færslunni eftir því hvað gerist: ekkert, ruslpóstur eða höfnun.",
        ],
      },
      {
        heading: "Stefnurnar þrjár",
        body: [
          "p=none: eftirlit. Enginn póstur er stöðvaður. Öruggur fyrsti áfangi.",
          "p=quarantine: póstur sem stenst ekki fer í ruslpóst.",
          "p=reject: póstur sem stenst ekki er stöðvaður. Þetta er markmiðið.",
        ],
        records: [{ type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" }],
      },
      {
        heading: "Af hverju skiptir þetta máli núna",
        body: [
          "Án DMARC getur hver sem er sent póst sem lítur út fyrir að koma frá léninu þínu, til dæmis falsaða reikninga. Google og Microsoft (Outlook.com) krefjast líka SPF, DKIM og DMARC af þeim sem senda meira en 5.000 pósta á dag til notenda sinna.",
        ],
      },
    ],
    faqs: [
      {
        question: "Hvað þýðir p=none?",
        answer: "Að DMARC sé í eftirlitsham: póstþjónar eiga ekki að stöðva neitt. Það ver ekki gegn fölsunum en er öruggur fyrsti áfangi áður en þú hertir í p=quarantine og p=reject.",
      },
      {
        question: "Þarf ég DMARC-skýrslur (rua)?",
        answer: "Ekki til að byrja. Skýrslurnar eru XML-skrár sem póstþjónar senda á netfang sem þú velur. Þær gefa yfirsýn yfir hverjir senda í nafni lénsins og má bæta við síðar með rua=mailto:netfang.",
      },
      {
        question: "Getur DMARC stöðvað lögmætan póst?",
        answer: "Já, ef p=quarantine eða p=reject er sett á áður en allar þjónustur sem senda í ykkar nafni standast SPF eða DKIM. Þess vegna byrjar þú á p=none og prófar áður en þú hertir.",
      },
    ],
    sources: [RFC_DMARC],
    related: ["spf", "dkim", "microsoft-365", "google-workspace"],
  },
  {
    id: "spf",
    slug: "hvad-er-spf",
    kind: "concept",
    title: "Hvað er SPF?",
    metaTitle: "Hvað er SPF-færsla? Útskýrt á mannamáli | dmark",
    description: "SPF er listi yfir þá þjóna sem mega senda póst í nafni lénsins. Hvernig færslan lítur út, reglurnar sem skipta máli og algengustu mistökin.",
    answer:
      "SPF (Sender Policy Framework) er TXT-færsla á léninu sem telur upp þá póstþjóna og þjónustur sem mega senda póst í nafni lénsins. Hún byrjar á v=spf1 og endar yfirleitt á -all eða ~all.",
    sections: [
      {
        heading: "Dæmi",
        body: ["Lén sem sendir aðeins í gegnum Microsoft 365:"],
        records: [{ type: "TXT", host: "@", value: "v=spf1 include:spf.protection.outlook.com -all" }],
      },
      {
        heading: "Reglurnar sem skipta máli",
        body: [
          "Aðeins ein SPF-færsla má vera á léninu. Tvær færslur gera SPF ógilt.",
          "Hámark 10 DNS-uppflettingar. Hvert include, a, mx, redirect og exists telst með, líka þau sem eru inni í öðrum include.",
          "-all þýðir að aðrir þjónar eru ekki leyfðir. ~all þýðir að póstur frá öðrum telst grunsamlegur. Notaðu aldrei +all.",
        ],
      },
    ],
    faqs: [
      {
        question: "Má ég hafa tvær SPF-færslur?",
        answer: "Nei. Tvær SPF-færslur gera SPF ógilt (permerror). Sameinaðu þær í eina færslu með öllum include-unum.",
      },
      {
        question: "Hvað gerist ef ég fer yfir 10 uppflettingar?",
        answer: "Þá skilar SPF villu og viðtakendur meta færsluna ógilda. Fjarlægðu þjónustur sem þið notið ekki lengur áður en þú grípur til flóknari lausna.",
      },
    ],
    sources: [RFC_SPF],
    related: ["dkim", "dmarc"],
  },
  {
    id: "dkim",
    slug: "hvad-er-dkim",
    kind: "concept",
    title: "Hvað er DKIM?",
    metaTitle: "Hvað er DKIM? Útskýrt á mannamáli | dmark",
    description: "DKIM bætir stafrænni undirskrift við tölvupóst svo viðtakendur sjái að hann kom frá þér. Hvernig það virkar og hvar þú færð lykilinn.",
    answer:
      "DKIM (DomainKeys Identified Mail) bætir stafrænni undirskrift við tölvupóst. Opinberi lykillinn er birtur í DNS á nafni eins og selector._domainkey.lénið svo viðtakendur geti staðfest að pósturinn kom frá ykkur og var ekki breytt á leiðinni.",
    sections: [
      {
        heading: "Hvernig DKIM virkar",
        body: [
          "Póstþjónustan undirritar hvern póst með einkalykli. Viðtakandinn sækir opinbera lykilinn í DNS og staðfestir undirskriftina. Ef pósturinn hefur breyst eða kemur annars staðar frá stenst hann ekki.",
        ],
      },
      {
        heading: "Selector og hvar þú færð lykilinn",
        body: [
          "Selector er heitið á lyklinum, til dæmis google hjá Google Workspace eða selector1 og selector2 hjá Microsoft 365. Póstþjónustan býr lykilinn til; þú setur aðeins færsluna sem hún gefur upp í DNS.",
        ],
        records: [{ type: "TXT", host: "google._domainkey", value: "(lykillinn frá póstþjónustunni, byrjar á v=DKIM1)", fromProvider: true }],
      },
    ],
    faqs: [
      {
        question: "Hvað er DKIM selector?",
        answer: "Heiti sem segir hvar lykillinn er í DNS. Hann sést í s= gildinu í DKIM-Signature haus pósts frá ykkur.",
      },
      {
        question: "Þarf ég DKIM ef ég er með SPF?",
        answer: "Já. SPF bregst oft þegar póstur er áframsendur en DKIM-undirskriftin fylgir póstinum. DMARC stenst ef annað hvort stenst, svo bæði saman eru öruggust.",
      },
    ],
    sources: [RFC_DKIM],
    related: ["spf", "dmarc", "google-workspace", "microsoft-365"],
  },
];

const EN: Guide[] = [
  {
    id: "microsoft-365",
    slug: "microsoft-365",
    kind: "provider",
    title: "DMARC, SPF and DKIM for Microsoft 365",
    metaTitle: "DMARC, SPF and DKIM for Microsoft 365: step by step | dmark",
    description: "Exact DNS records and steps to protect a Microsoft 365 domain from email spoofing. Free check at dmark.is.",
    answer:
      "To protect a domain that uses Microsoft 365 you need three things: the SPF record v=spf1 include:spf.protection.outlook.com -all, two DKIM CNAME records (selector1 and selector2) shown in Microsoft Defender, and a DMARC record at _dmarc. Start DMARC at p=none, then move to p=quarantine and finally p=reject once all your mail passes.",
    sections: [
      {
        heading: "1. SPF: say who may send",
        body: ["Microsoft recommends -all for domains that only send through Microsoft 365, when DKIM and DMARC are also set up."],
        records: [{ type: "TXT", host: "@", value: "v=spf1 include:spf.protection.outlook.com -all" }],
        note: "If other services also send email as your domain, such as invoicing or newsletters, add them to the same record. A domain may only have one SPF record.",
      },
      {
        heading: "2. DKIM: turn on signing",
        steps: [
          "Open security.microsoft.com/authentication and choose the DKIM tab.",
          "Click your domain. Microsoft shows two CNAME records to publish.",
          "Add both at your DNS host. Put only the host part in the name field, for example selector1._domainkey.",
          "Return to Defender and switch on “Sign messages for this domain with DKIM signatures”.",
        ],
        records: [
          { type: "CNAME", host: "selector1._domainkey", value: "(the value Microsoft shows)", fromProvider: true },
          { type: "CNAME", host: "selector2._domainkey", value: "(the value Microsoft shows)", fromProvider: true },
        ],
        note: "The values are unique to each domain, so copy them straight from Defender. If your DNS is at Cloudflare, set both records to “DNS only”.",
      },
      {
        heading: "3. DMARC: start in monitoring mode",
        body: ["p=none blocks nothing. It is a safe first stage while you confirm all legitimate mail passes."],
        records: [{ type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" }],
      },
      {
        heading: "4. Tighten DMARC in stages",
        body: [
          "Send a test email from everything that sends as your domain: normal email, invoicing, web shop, newsletters and web forms. When everything arrives normally, change to p=quarantine. After a week or two with no problems, move to p=reject.",
        ],
        records: [
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=quarantine;" },
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=reject;" },
        ],
      },
    ],
    faqs: [
      {
        question: "Should I use -all or ~all for Microsoft 365?",
        answer: "Microsoft recommends -all when DKIM and DMARC are also set up, because DMARC can then act on mail that fails SPF and has no DKIM signature.",
      },
      {
        question: "Why can't Microsoft find my CNAME records?",
        answer: "Usually the full name was entered in the host field so the domain is repeated, or the Cloudflare proxy is on. Use only selector1._domainkey and selector2._domainkey and set them to DNS only. DNS changes can take up to 48 hours.",
      },
      {
        question: "How long does this take?",
        answer: "The records take minutes. Then allow a week or two on p=none and p=quarantine before moving to p=reject.",
      },
    ],
    sources: [MS_SPF, MS_DKIM, RFC_DMARC],
    related: ["dmarc", "spf", "dkim"],
  },
  {
    id: "google-workspace",
    slug: "google-workspace",
    kind: "provider",
    title: "DMARC, SPF and DKIM for Google Workspace",
    metaTitle: "DMARC, SPF and DKIM for Google Workspace: step by step | dmark",
    description: "Exact DNS records and steps to protect a Google Workspace (Gmail) domain from email spoofing. Free check at dmark.is.",
    answer:
      "Domains on Google Workspace need the SPF record v=spf1 include:_spf.google.com ~all, a DKIM key generated in Google Admin and published as a TXT record at google._domainkey, and a DMARC record at _dmarc. Start DMARC at p=none, then move to p=quarantine and finally p=reject.",
    sections: [
      {
        heading: "1. SPF: say who may send",
        records: [{ type: "TXT", host: "@", value: "v=spf1 include:_spf.google.com ~all" }],
        note: "If other services also send email as your domain, add them to the same record. A domain may only have one SPF record.",
      },
      {
        heading: "2. DKIM: generate a key in Google Admin",
        steps: [
          "In the Google Admin console: Apps > Google Workspace > Gmail > Authenticate email.",
          "Choose the domain and click “Generate new record”. Pick 2048-bit and keep the prefix google.",
          "Copy the TXT value Google shows (it starts with v=DKIM1) into a new TXT record at google._domainkey.",
          "Wait for the record to propagate, then click “Start authentication” in Google Admin.",
        ],
        records: [{ type: "TXT", host: "google._domainkey", value: "(the value Google shows, starting with v=DKIM1)", fromProvider: true }],
        note: "If Gmail was only just turned on, Google may need 24 to 72 hours before the key can be generated, and up to 48 hours before DKIM starts working.",
      },
      {
        heading: "3. DMARC: start in monitoring mode",
        body: ["p=none blocks nothing. It is a safe first stage while you confirm all legitimate mail passes."],
        records: [{ type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" }],
      },
      {
        heading: "4. Tighten DMARC in stages",
        body: [
          "Send a test email from everything that sends as your domain. When everything arrives normally, change to p=quarantine. After a week or two with no problems, move to p=reject.",
        ],
        records: [
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=quarantine;" },
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=reject;" },
        ],
      },
    ],
    faqs: [
      {
        question: "What SPF record does Google Workspace use?",
        answer: "v=spf1 include:_spf.google.com ~all. If other services also send email as your domain, add them to the same record instead of creating a second one.",
      },
      {
        question: "How do I check DKIM is working?",
        answer: "Send an email to someone else's Gmail address (not your own) and look at Authentication-Results in the headers. It should say dkim=pass.",
      },
      {
        question: "Why isn't DKIM working yet?",
        answer: "DNS changes can take up to 48 hours. Also remember to click “Start authentication” in Google Admin after the record is published.",
      },
    ],
    sources: [G_SPF, G_DKIM, RFC_DMARC],
    related: ["dmarc", "spf", "dkim"],
  },
  {
    id: "no-email",
    slug: "domain-without-email",
    kind: "provider",
    title: "Lock down a domain that doesn't send email",
    metaTitle: "Lock down a domain that doesn't send email: two DNS records | dmark",
    description: "Unused domains are popular with scammers. Two DNS records stop anyone sending email as the domain. Free check at dmark.is.",
    answer:
      "A domain with no mailboxes that sends no email can be locked with two TXT records: v=spf1 -all on the domain itself and v=DMARC1; p=reject; at _dmarc. Receiving mail servers then reject any email claiming to come from it.",
    sections: [
      {
        heading: "The records",
        records: [
          { type: "TXT", host: "@", value: "v=spf1 -all" },
          { type: "TXT", host: "_dmarc", value: "v=DMARC1; p=reject;" },
        ],
        note: "If an SPF or DMARC record already exists, replace it instead of adding a second one.",
      },
      {
        heading: "Before you lock it",
        body: [
          "Make sure nothing sends email as the domain: web forms, a web shop, invoicing, newsletters or devices such as printers. If something does, follow the guide for your email provider instead.",
        ],
      },
      {
        heading: "Optional: null MX",
        body: ["To also say the domain accepts no email, add an MX record with priority 0 and the value “.” (a dot), as defined in RFC 7505. Not every DNS host supports it."],
        records: [{ type: "MX", host: "@", value: "0 ." }],
      },
    ],
    faqs: [
      {
        question: "Should I lock domains I don't use for email?",
        answer: "Yes. Scammers often pick unused domains and old brand names because nothing protects them. Locking costs nothing and has no effect when no email is sent.",
      },
      {
        question: "What if I start using the domain for email later?",
        answer: "Replace the SPF record with your provider's, remove the null MX if you added one, and start DMARC again at p=none.",
      },
    ],
    sources: [RFC_SPF, RFC_DMARC, RFC_NULLMX],
    related: ["dmarc", "spf"],
  },
  {
    id: "dmarc",
    slug: "what-is-dmarc",
    kind: "concept",
    title: "What is DMARC?",
    metaTitle: "What is DMARC? Explained in plain language | dmark",
    description: "DMARC tells mail servers what to do with fake email sent in your domain's name. How it works, which policy to pick and how to start.",
    answer:
      "DMARC is a DNS record that tells mail servers what to do with email that claims to be from your domain but fails SPF or DKIM. It is a TXT record at _dmarc.yourdomain and the policy can be p=none (monitor), p=quarantine (spam folder) or p=reject (refuse).",
    sections: [
      {
        heading: "How DMARC works",
        body: [
          "When an email arrives, the receiver checks whether it passes SPF or DKIM and whether that domain matches the domain in the From line the recipient sees. If either passes with a matching domain, DMARC passes.",
          "If the email fails, the policy in your DMARC record decides what happens: nothing, spam folder or rejection.",
        ],
      },
      {
        heading: "The three policies",
        body: [
          "p=none: monitoring. No email is blocked. A safe first stage.",
          "p=quarantine: email that fails goes to spam.",
          "p=reject: email that fails is refused. This is the goal.",
        ],
        records: [{ type: "TXT", host: "_dmarc", value: "v=DMARC1; p=none;" }],
      },
      {
        heading: "Why it matters now",
        body: [
          "Without DMARC anyone can send email that looks like it comes from your domain, such as fake invoices. Google and Microsoft (Outlook.com) also require SPF, DKIM and DMARC from senders of more than 5,000 messages a day to their users.",
        ],
      },
    ],
    faqs: [
      {
        question: "What does p=none mean?",
        answer: "That DMARC is in monitoring mode: mail servers should not block anything. It does not stop spoofing, but it is a safe first stage before tightening to p=quarantine and p=reject.",
      },
      {
        question: "Do I need DMARC reports (rua)?",
        answer: "Not to start. Reports are XML files mail servers send to an address you choose. They show who sends as your domain and can be added later with rua=mailto:address.",
      },
      {
        question: "Can DMARC block legitimate email?",
        answer: "Yes, if p=quarantine or p=reject is set before every service that sends as your domain passes SPF or DKIM. That is why you start at p=none and test before tightening.",
      },
    ],
    sources: [RFC_DMARC],
    related: ["spf", "dkim", "microsoft-365", "google-workspace"],
  },
  {
    id: "spf",
    slug: "what-is-spf",
    kind: "concept",
    title: "What is SPF?",
    metaTitle: "What is an SPF record? Explained in plain language | dmark",
    description: "SPF is the list of servers allowed to send email as your domain. What the record looks like, the rules that matter and the most common mistakes.",
    answer:
      "SPF (Sender Policy Framework) is a TXT record on your domain that lists the mail servers and services allowed to send email as that domain. It starts with v=spf1 and usually ends with -all or ~all.",
    sections: [
      {
        heading: "Example",
        body: ["A domain that only sends through Microsoft 365:"],
        records: [{ type: "TXT", host: "@", value: "v=spf1 include:spf.protection.outlook.com -all" }],
      },
      {
        heading: "The rules that matter",
        body: [
          "A domain may only have one SPF record. Two records make SPF invalid.",
          "At most 10 DNS lookups. Every include, a, mx, redirect and exists counts, including those nested inside other includes.",
          "-all means other servers are not allowed. ~all means mail from others is suspicious. Never use +all.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I have two SPF records?",
        answer: "No. Two SPF records make SPF invalid (permerror). Merge them into one record with all the includes.",
      },
      {
        question: "What happens if I go over 10 lookups?",
        answer: "SPF returns an error and receivers treat the record as invalid. Remove services you no longer use before reaching for more complex fixes.",
      },
    ],
    sources: [RFC_SPF],
    related: ["dkim", "dmarc"],
  },
  {
    id: "dkim",
    slug: "what-is-dkim",
    kind: "concept",
    title: "What is DKIM?",
    metaTitle: "What is DKIM? Explained in plain language | dmark",
    description: "DKIM adds a digital signature to email so receivers can tell it came from you. How it works and where to get the key.",
    answer:
      "DKIM (DomainKeys Identified Mail) adds a digital signature to email. The public key is published in DNS at a name like selector._domainkey.yourdomain so receivers can verify the email came from you and was not changed on the way.",
    sections: [
      {
        heading: "How DKIM works",
        body: [
          "Your email provider signs each message with a private key. The receiver fetches the public key from DNS and checks the signature. If the message was changed or came from somewhere else, it fails.",
        ],
      },
      {
        heading: "Selectors and where to get the key",
        body: [
          "The selector is the name of the key, for example google for Google Workspace, or selector1 and selector2 for Microsoft 365. Your email provider generates the key; you only publish the record it gives you.",
        ],
        records: [{ type: "TXT", host: "google._domainkey", value: "(the key from your provider, starting with v=DKIM1)", fromProvider: true }],
      },
    ],
    faqs: [
      {
        question: "What is a DKIM selector?",
        answer: "A name that says where the key is in DNS. You can see it in the s= value of the DKIM-Signature header on your email.",
      },
      {
        question: "Do I need DKIM if I have SPF?",
        answer: "Yes. SPF often fails when email is forwarded, but the DKIM signature travels with the message. DMARC passes if either one passes, so both together are safest.",
      },
    ],
    sources: [RFC_DKIM],
    related: ["spf", "dmarc", "google-workspace", "microsoft-365"],
  },
];

export const guides: Record<GuideLocale, Guide[]> = { is: IS, en: EN };

export function toGuideLocale(locale: string): GuideLocale {
  return locale === "en" ? "en" : "is";
}

export function guideById(locale: string, id: GuideId): Guide {
  return guides[toGuideLocale(locale)].find((g) => g.id === id)!;
}

export function guideBySlug(locale: string, slug: string): Guide | undefined {
  return guides[toGuideLocale(locale)].find((g) => g.slug === slug);
}

export function guidePath(locale: string, id?: GuideId): string {
  const l = toGuideLocale(locale);
  return id ? `/${l}/${guideSection[l]}/${guideById(l, id).slug}/` : `/${l}/${guideSection[l]}/`;
}

/** Same guide in both languages, for hreflang. */
export function guideAlternates(id?: GuideId) {
  return { is: guidePath("is", id), en: guidePath("en", id), "x-default": guidePath("is", id) };
}

export function guideStructuredData(locale: string, guide: Guide) {
  const l = toGuideLocale(locale);
  const url = `${siteURL}${guidePath(l, guide.id)}`;
  const home = l === "en" ? "Home" : "Forsíða";
  const graph: Record<string, unknown>[] = [
    kastroOrganization,
    {
      "@type": "TechArticle",
      "@id": `${url}#article`,
      headline: guide.title,
      description: guide.description,
      abstract: guide.answer,
      url,
      inLanguage: l,
      datePublished: lastReviewed,
      dateModified: lastReviewed,
      author: { "@id": kastroOrganization["@id"] },
      publisher: { "@id": kastroOrganization["@id"] },
      isPartOf: { "@id": `${siteURL}/#website` },
      about: guide.id === "microsoft-365" || guide.id === "google-workspace" ? ["SPF", "DKIM", "DMARC"] : guide.id.toUpperCase(),
      citation: guide.sources.map((s) => s.url),
    },
    {
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      url,
      inLanguage: l,
      mainEntity: guide.faqs.map(({ question, answer }) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: home, item: `${siteURL}/${l}/` },
        { "@type": "ListItem", position: 2, name: guideIndexCopy[l].title, item: `${siteURL}${guidePath(l)}` },
        { "@type": "ListItem", position: 3, name: guide.title, item: url },
      ],
    },
  ];
  const stepSections = guide.sections.filter((s) => s.records?.length || s.steps?.length);
  if (guide.kind === "provider" && stepSections.length) {
    graph.push({
      "@type": "HowTo",
      "@id": `${url}#howto`,
      name: guide.title,
      description: guide.answer,
      inLanguage: l,
      tool: [{ "@type": "HowToTool", name: "dmark", url: `${siteURL}/${l}/` }],
      step: stepSections.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.heading.replace(/^\d+\.\s*/, ""),
        text: [...(s.body ?? []), ...(s.steps ?? []), ...(s.records ?? []).filter((r) => !r.fromProvider).map((r) => `${r.type} ${r.host} ${r.value}`), s.note ?? ""].filter(Boolean).join(" "),
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}
