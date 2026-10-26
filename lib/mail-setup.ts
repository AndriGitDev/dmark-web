import type { ScanPayload } from "./scan";
import { guideById, guidePath } from "./guides";

/**
 * Turns a scan into a plain-language verdict and an ordered list of steps with
 * exact DNS records to copy. Pure and locale-aware so it can be unit tested.
 */

export type Provider = "google" | "microsoft" | "none" | "other";
export type Verdict = "protected" | "almost" | "exposed" | "unknown";
export type StepId = "spf" | "dkim" | "dmarc" | "quarantine" | "reject" | "lockdown";
export type StepStatus = "done" | "now" | "later";

export type SetupRecord = {
  type: "TXT" | "CNAME";
  /** Host name relative to the domain; "@" is the domain itself. */
  host: string;
  /** Full name, for DNS hosts that want the whole name. */
  fqdn: string;
  value: string;
  /** Set when the exact value comes from the provider's console. */
  fromProvider?: boolean;
};

export type HelpLink = { label: string; url: string };

export type SetupStep = {
  id: StepId;
  status: StepStatus;
  title: string;
  why: string;
  how: string[];
  records: SetupRecord[];
  links: HelpLink[];
  /** Short note about waiting or checking before this step. */
  wait?: string;
  /** True when the record replaces an existing one rather than adding one. */
  replaces?: boolean;
};

export type DnsHost = { name: string; help?: HelpLink };

export type MailPlan = {
  domain: string;
  verdict: Verdict;
  headline: string;
  detail: string;
  provider: Provider;
  providerLabel: string;
  dnsHost: DnsHost | null;
  steps: SetupStep[];
  done: number;
  total: number;
};

const PROVIDERS = {
  google: {
    label: "Google Workspace",
    include: "_spf.google.com",
    all: "~all",
    mx: [/(^|\.)google\.com$/, /(^|\.)googlemail\.com$/],
  },
  microsoft: {
    label: "Microsoft 365",
    include: "spf.protection.outlook.com",
    all: "-all",
    mx: [/\.mail\.protection\.outlook\.com$/, /\.mx\.microsoft$/],
  },
} as const;

const DNS_HOSTS: Array<{ match: RegExp; name: string; help?: string }> = [
  { match: /\.ns\.cloudflare\.com$/, name: "Cloudflare", help: "https://developers.cloudflare.com/dns/manage-dns-records/how-to/create-dns-records" },
  { match: /\.awsdns-\d+\./, name: "Amazon Route 53", help: "https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html" },
  { match: /\.domaincontrol\.com$/, name: "GoDaddy", help: "https://www.godaddy.com/help/add-a-txt-record-19232" },
  { match: /\.registrar-servers\.com$/, name: "Namecheap", help: "https://www.namecheap.com/support/knowledgebase/article.aspx/317/2237/how-do-i-add-txtspfdkimdmarc-records-for-my-domain" },
  { match: /\.googledomains\.com$/, name: "Google Cloud DNS" },
  { match: /\.azure-dns\./, name: "Azure DNS" },
  { match: /(^|\.)isnic\.is$/, name: "ISNIC" },
  { match: /(^|\.)1984\.is$|(^|\.)1984hosting\.com$/, name: "1984" },
];

function registrable(name: string) {
  return name.split(".").slice(-2).join(".");
}

export function detectDnsHost(ns: string[]): DnsHost | null {
  if (!ns.length) return null;
  for (const host of DNS_HOSTS) {
    if (ns.some((n) => host.match.test(n)))
      return { name: host.name, help: host.help ? { label: host.name, url: host.help } : undefined };
  }
  return { name: registrable(ns[0]) };
}

function spfTerms(record: string): string[] | null {
  const terms = record.trim().split(/\s+/);
  if (terms[0]?.toLowerCase() !== "v=spf1") return null;
  return terms.slice(1);
}

export function spfIncludes(record: string): string[] {
  return (spfTerms(record) ?? [])
    .map((t) => /^[+]?include:(.+)$/i.exec(t)?.[1]?.toLowerCase())
    .filter((t): t is string => !!t);
}

export function detectProvider(result: ScanPayload): Provider {
  const mx = result.mail?.mx ?? [];
  for (const id of ["google", "microsoft"] as const)
    if (mx.some((m) => PROVIDERS[id].mx.some((re) => re.test(m)))) return id;
  const includes = spfIncludes(result.spf.record);
  for (const id of ["google", "microsoft"] as const)
    if (includes.includes(PROVIDERS[id].include)) return id;
  // No inbound mail and nothing authorised to send: the domain does not use email.
  const sendsNothing = !result.spf.record || /^v=spf1\s+-all$/i.test(result.spf.record.trim());
  if (result.mail?.mxKnown && mx.length === 0 && sendsNothing) return "none";
  return "other";
}

/** Adds one provider include to an existing SPF record, keeping everything else. */
export function mergeSpf(existing: string, include: string, defaultAll: string): string | null {
  if (!existing) return `v=spf1 include:${include} ${defaultAll}`;
  const terms = spfTerms(existing);
  if (!terms || terms.some((t) => /^redirect=/i.test(t))) return null;
  if (spfIncludes(existing).includes(include)) return existing.trim().replace(/\s+/g, " ");
  const allTerm = terms.find((t) => /^[+~?-]?all$/i.test(t));
  const keep = terms.filter((t) => !/^[+~?-]?all$/i.test(t));
  // Never carry a permissive +all or ?all forward.
  const all = allTerm && /^[-~]all$/i.test(allTerm) ? allTerm.toLowerCase() : defaultAll;
  return ["v=spf1", ...keep, `include:${include}`, all].join(" ");
}

function dmarcTags(record: string): Array<[string, string]> | null {
  if (!/^\s*v\s*=\s*DMARC1\s*(;|$)/i.test(record)) return null;
  return record
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const at = part.indexOf("=");
      return [part.slice(0, at).trim().toLowerCase(), part.slice(at + 1).trim()] as [string, string];
    })
    .filter(([key]) => !!key);
}

/** Sets the DMARC policy, keeps reporting and other tags, and applies it to all mail. */
export function withDmarcPolicy(existing: string, policy: "none" | "quarantine" | "reject"): string {
  const tags = (existing && dmarcTags(existing)) || [["v", "DMARC1"]];
  const out: Array<[string, string]> = [["v", "DMARC1"], ["p", policy]];
  for (const [key, value] of tags) {
    if (key === "v" || key === "p" || key === "pct") continue;
    out.push([key, value]);
  }
  return out.map(([k, v]) => `${k}=${v}`).join("; ") + ";";
}

function record(domain: string, type: SetupRecord["type"], host: string, value: string, fromProvider = false): SetupRecord {
  return { type, host, fqdn: host === "@" ? domain : `${host}.${domain}`, value, fromProvider };
}

export function buildMailPlan(result: ScanPayload, locale = "is"): MailPlan {
  const t = (en: string, is: string) => (locale === "en" ? en : is);
  const domain = result.domain;
  const provider = detectProvider(result);
  const dnsHost = detectDnsHost(result.mail?.ns ?? []);
  const complete = result.source === "live" && !!result.assessment && !result.assessment.incomplete;
  const pct = result.assessment?.pct ?? 100;
  const policy = result.dmarc.valid ? result.dmarc.policy : "missing";
  const guideLink = (id: Parameters<typeof guidePath>[1] & string) => ({ label: guideById(locale, id).title, url: guidePath(locale, id) });
  const hostLinks = dnsHost?.help ? [{ label: t(`Adding a record at ${dnsHost.help.label}`, `Að bæta við færslu hjá ${dnsHost.help.label}`), url: dnsHost.help.url }] : [];
  const providerLabel =
    provider === "google" || provider === "microsoft"
      ? PROVIDERS[provider].label
      : provider === "none"
        ? t("No email on this domain", "Enginn tölvupóstur á þessu léni")
        : t("Other or unknown provider", "Önnur eða óþekkt póstþjónusta");

  const steps: Array<Omit<SetupStep, "status"> & { done: boolean }> = [];

  if (provider === "none") {
    const spfLocked = /^v=spf1\s+-all$/i.test(result.spf.record.trim());
    const rejecting = policy === "reject" && pct === 100;
    steps.push({
      id: "lockdown",
      done: spfLocked && rejecting,
      title: t("Lock the domain so nobody can send email from it", "Læstu léninu svo enginn geti sent póst frá því"),
      why: t(
        `${domain} has no mailboxes, so no one should be sending email from it. Two records tell every receiving mail server to reject anything that claims to come from ${domain}.`,
        `${domain} hefur engin pósthólf og því á enginn að senda póst frá því. Tvær færslur segja öllum póstþjónum að hafna pósti sem þykist koma frá ${domain}.`,
      ),
      how: [
        t("Open the DNS settings where your domain is managed.", "Opnaðu DNS-stillingarnar þar sem lénið er vistað."),
        t("Add (or replace) the two TXT records below. Keep only one SPF record.", "Bættu við (eða skiptu út) TXT-færslunum tveimur hér fyrir neðan. Hafðu aðeins eina SPF-færslu."),
        t("Save, wait a few minutes, then check again here.", "Vistaðu, bíddu í nokkrar mínútur og athugaðu svo aftur hér."),
      ],
      records: [record(domain, "TXT", "@", "v=spf1 -all"), record(domain, "TXT", "_dmarc", withDmarcPolicy(result.dmarc.record, "reject"))],
      links: [...hostLinks, guideLink("no-email")],
      wait: t(
        "Only do this if nothing sends email as this domain, such as a web shop, invoicing system or newsletter. If something does, tell us and use the full setup instead.",
        "Gerðu þetta aðeins ef ekkert sendir póst í nafni lénsins, t.d. vefverslun, reikningakerfi eða fréttabréf. Ef eitthvað gerir það skaltu fylgja fullri uppsetningu í staðinn.",
      ),
      replaces: !!result.spf.record || !!result.dmarc.record,
    });
  } else {
    const known = provider === "google" || provider === "microsoft" ? PROVIDERS[provider] : null;
    const spfOk = result.spf.valid && result.spf.lookups <= 10 && (!known || spfIncludes(result.spf.record).includes(known.include));
    const merged = known ? mergeSpf(result.spf.record, known.include, known.all) : null;
    const tooManyLookups = result.spf.lookups > 10;
    steps.push({
      id: "spf",
      done: spfOk,
      title: t("Say which servers may send your email (SPF)", "Segðu hvaða þjónar mega senda póstinn ykkar (SPF)"),
      why: t(
        "SPF is a list of the services allowed to send email as your domain. Mail from anywhere else looks suspicious to the receiver.",
        "SPF er listi yfir þær þjónustur sem mega senda póst í nafni lénsins. Póstur annars staðar frá virkar grunsamlegur hjá viðtakandanum.",
      ),
      how: tooManyLookups
        ? [
            t("Your SPF record points to too many other records (more than 10), so receivers ignore it.", "SPF-færslan vísar á of margar aðrar færslur (fleiri en 10) svo viðtakendur hunsa hana."),
            t("Remove services you no longer use. If you still need all of them, the SPF tool under Technical details can help, or ask your IT person.", "Fjarlægðu þjónustur sem þið notið ekki lengur. Ef þið þurfið þær allar getur SPF-tólið undir Tæknilegar upplýsingar hjálpað, eða tölvumaðurinn ykkar."),
          ]
        : known && merged
          ? [
              t("Open the DNS settings where your domain is managed.", "Opnaðu DNS-stillingarnar þar sem lénið er vistað."),
              result.spf.record
                ? t("Find the TXT record that starts with v=spf1 and replace its value with the one below. There must be only one.", "Finndu TXT-færsluna sem byrjar á v=spf1 og settu gildið hér fyrir neðan í staðinn. Það má aðeins vera ein slík.")
                : t("Add a new TXT record with the values below.", "Bættu við nýrri TXT-færslu með gildunum hér fyrir neðan."),
              t("Save, wait a few minutes, then check again here.", "Vistaðu, bíddu í nokkrar mínútur og athugaðu svo aftur hér."),
            ]
          : [
              t("Ask your email provider for the SPF value to use. It starts with v=spf1.", "Spyrðu póstþjónustuna hvaða SPF-gildi á að nota. Það byrjar á v=spf1."),
              t("Add it as one TXT record on the domain itself. If you already have an SPF record, add the provider to it instead of creating a second one.", "Settu það inn sem eina TXT-færslu á léninu sjálfu. Ef SPF-færsla er þegar til skaltu bæta þjónustunni við hana í stað þess að búa til aðra."),
              t("Save, wait a few minutes, then check again here.", "Vistaðu, bíddu í nokkrar mínútur og athugaðu svo aftur hér."),
            ],
      records: known && merged && !tooManyLookups ? [record(domain, "TXT", "@", merged)] : [],
      links: [
        ...hostLinks,
        ...(provider === "microsoft" ? [{ label: t("Microsoft: set up SPF", "Microsoft: uppsetning SPF"), url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-spf-configure" }] : []),
        ...(provider === "google" ? [{ label: t("Google: set up SPF", "Google: uppsetning SPF"), url: "https://support.google.com/a/answer/33786" }] : []),
        provider === "microsoft" ? guideLink("microsoft-365") : provider === "google" ? guideLink("google-workspace") : guideLink("spf"),
      ],
      replaces: !!result.spf.record,
    });

    const dkimOk = result.authentication?.dkim
      ? result.authentication.dkim.state === "published"
      : result.assessment?.dkimState === "green";
    steps.push({
      id: "dkim",
      done: dkimOk,
      title: t("Turn on email signing (DKIM)", "Kveiktu á undirritun pósts (DKIM)"),
      why: t(
        "DKIM adds a digital signature to every email you send, so receivers can tell it really came from you and was not changed on the way.",
        "DKIM bætir stafrænni undirskrift við allan póst sem þið sendið svo viðtakendur sjái að hann kom raunverulega frá ykkur og var ekki breytt á leiðinni.",
      ),
      how:
        provider === "google"
          ? [
              t("In the Google Admin console, go to Apps > Google Workspace > Gmail > Authenticate email.", "Í Google Admin console: Apps > Google Workspace > Gmail > Authenticate email."),
              t("Choose the domain, click Generate new record, pick 2048-bit and keep the prefix google.", "Veldu lénið, smelltu á Generate new record, veldu 2048 bita og haltu forskeytinu google."),
              t("Copy the value Google shows into a new TXT record (below). Then go back and click Start authentication.", "Afritaðu gildið sem Google sýnir í nýja TXT-færslu (hér fyrir neðan). Farðu svo til baka og smelltu á Start authentication."),
            ]
          : provider === "microsoft"
            ? [
                t("Open the Microsoft Defender portal at security.microsoft.com/authentication and choose the DKIM tab.", "Opnaðu Microsoft Defender á security.microsoft.com/authentication og veldu DKIM flipann."),
                t("Click your domain. Microsoft shows two CNAME records to publish.", "Smelltu á lénið. Microsoft sýnir tvær CNAME-færslur sem þarf að bæta við."),
                t("Add both CNAME records (below) with the values Microsoft gives you, then switch on Sign messages for this domain with DKIM signatures.", "Bættu báðum CNAME-færslunum við (hér fyrir neðan) með gildunum frá Microsoft og kveiktu svo á Sign messages for this domain with DKIM signatures."),
              ]
            : [
                t("In your email provider's admin settings, look for DKIM or email authentication and turn it on.", "Í stjórnborði póstþjónustunnar skaltu leita að DKIM eða email authentication og kveikja á því."),
                t("The provider gives you one or more DNS records. Add them exactly as shown.", "Þjónustan gefur upp eina eða fleiri DNS-færslur. Bættu þeim við nákvæmlega eins og þær eru sýndar."),
                t("If dmark still cannot find the key, enter its selector under Technical details and check again.", "Ef dmark finnur samt ekki lykilinn skaltu slá inn selector undir Tæknilegar upplýsingar og athuga aftur."),
              ],
      records:
        provider === "google"
          ? [record(domain, "TXT", "google._domainkey", t("(the value Google shows, starting with v=DKIM1)", "(gildið sem Google sýnir, byrjar á v=DKIM1)"), true)]
          : provider === "microsoft"
            ? [
                record(domain, "CNAME", "selector1._domainkey", t("(the selector1 value Microsoft shows)", "(selector1 gildið sem Microsoft sýnir)"), true),
                record(domain, "CNAME", "selector2._domainkey", t("(the selector2 value Microsoft shows)", "(selector2 gildið sem Microsoft sýnir)"), true),
              ]
            : [],
      links: [
        ...(provider === "google" ? [{ label: t("Google: set up DKIM", "Google: uppsetning DKIM"), url: "https://support.google.com/a/answer/174124" }] : []),
        ...(provider === "microsoft"
          ? [
              { label: t("Open Microsoft Defender DKIM settings", "Opna DKIM stillingar í Microsoft Defender"), url: "https://security.microsoft.com/authentication?viewid=DKIM" },
              { label: t("Microsoft: set up DKIM", "Microsoft: uppsetning DKIM"), url: "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-dkim-configure" },
            ]
          : []),
        ...hostLinks,
      ],
      wait: provider === "google"
        ? t("Google may need up to 48 hours before the record is picked up.", "Það getur tekið Google allt að 48 klukkustundir að sjá færsluna.")
        : provider === "microsoft" && dnsHost?.name === "Cloudflare"
          ? t("In Cloudflare, set both CNAME records to DNS only (grey cloud).", "Í Cloudflare skaltu stilla báðar CNAME-færslurnar á DNS only (grátt ský).")
          : undefined,
    });

    steps.push({
      id: "dmarc",
      done: result.dmarc.valid,
      title: t("Add a DMARC record", "Bættu við DMARC-færslu"),
      why: t(
        "DMARC tells receiving mail servers what to do with email that fails the checks above. You start in watch mode, so nothing gets blocked yet.",
        "DMARC segir póstþjónum hvað á að gera við póst sem stenst ekki athuganirnar hér að ofan. Þú byrjar í eftirlitsham svo ekkert er stöðvað strax.",
      ),
      how: [
        t("Open the DNS settings where your domain is managed.", "Opnaðu DNS-stillingarnar þar sem lénið er vistað."),
        result.dmarc.record
          ? t("Replace the existing _dmarc TXT record with the value below.", "Settu gildið hér fyrir neðan í staðinn fyrir núverandi _dmarc TXT-færslu.")
          : t("Add a new TXT record with the values below.", "Bættu við nýrri TXT-færslu með gildunum hér fyrir neðan."),
        t("Save, wait a few minutes, then check again here.", "Vistaðu, bíddu í nokkrar mínútur og athugaðu svo aftur hér."),
      ],
      records: [record(domain, "TXT", "_dmarc", withDmarcPolicy(result.dmarc.valid ? result.dmarc.record : "", "none"))],
      links: [...hostLinks, guideLink("dmarc")],
      replaces: !!result.dmarc.record,
    });

    const sendersReview = t(
      "Before this step, send a test email from everything that sends mail as your domain (normal email, invoicing, web shop, newsletters, forms) and confirm it arrives normally.",
      "Áður en þú tekur þetta skref skaltu senda prufupóst frá öllu sem sendir póst í nafni lénsins (venjulegur póstur, reikningakerfi, vefverslun, fréttabréf, vefform) og staðfesta að hann berist eðlilega.",
    );
    steps.push({
      id: "quarantine",
      done: (policy === "quarantine" || policy === "reject") && pct === 100,
      title: t("Send fake email to spam", "Sendu falsaðan póst í ruslpóst"),
      why: t(
        "Now receivers are told to put email that fails the checks into spam. This is where you start to be protected.",
        "Nú er póstþjónum sagt að setja póst sem stenst ekki athuganirnar í ruslpóst. Hér byrjar raunveruleg vernd.",
      ),
      how: [
        t("Change the _dmarc TXT record to the value below.", "Breyttu _dmarc TXT-færslunni í gildið hér fyrir neðan."),
        t("Keep an eye out for a week: if someone says your email landed in spam, go back to p=none and check that sender.", "Fylgstu með í viku: ef einhver segir að póstur frá ykkur hafi lent í ruslpósti skaltu fara aftur í p=none og skoða þann sendanda."),
      ],
      records: [record(domain, "TXT", "_dmarc", withDmarcPolicy(result.dmarc.record, "quarantine"))],
      links: hostLinks,
      wait: sendersReview,
      replaces: true,
    });
    steps.push({
      id: "reject",
      done: policy === "reject" && pct === 100,
      title: t("Block fake email completely", "Stöðvaðu falsaðan póst alveg"),
      why: t(
        "The strongest setting: email that pretends to be from your domain is refused outright and never reaches the inbox.",
        "Sterkasta stillingin: póstur sem þykist vera frá léninu er stöðvaður og berst aldrei í innhólfið.",
      ),
      how: [t("After a week or two with no problems, change the _dmarc TXT record to the value below.", "Eftir viku eða tvær án vandræða skaltu breyta _dmarc TXT-færslunni í gildið hér fyrir neðan.")],
      records: [record(domain, "TXT", "_dmarc", withDmarcPolicy(result.dmarc.record, "reject"))],
      links: hostLinks,
      replaces: true,
    });
  }

  // Steps are ordered so enforcement only comes after SPF and DKIM work; the first unfinished one is "now".
  let current = false;
  const ordered: SetupStep[] = steps.map(({ done, ...step }) => {
    if (done) return { ...step, status: "done" };
    const status: StepStatus = current ? "later" : "now";
    current = true;
    return { ...step, status };
  });
  const done = ordered.filter((s) => s.status === "done").length;

  let verdict: Verdict;
  if (!complete) verdict = "unknown";
  else if (policy === "reject" && pct === 100 && (provider === "none" || result.spf.valid)) verdict = "protected";
  else if (policy === "quarantine" || policy === "reject") verdict = "almost";
  else verdict = "exposed";

  const headline = {
    protected: t(`${domain} is protected against email spoofing`, `${domain} er varið gegn fölsuðum pósti`),
    almost: t(`${domain} is partly protected`, `${domain} er að hluta varið`),
    exposed: t(`Anyone can send email pretending to be ${domain}`, `Hver sem er getur sent póst í nafni ${domain}`),
    unknown: t("We could not finish checking this domain", "Ekki tókst að klára athugun á léninu"),
  }[verdict];
  const detail = {
    protected: t("Receivers reject email that falsely claims to come from you. Recheck after any change to how you send email.", "Póstþjónar hafna pósti sem þykist ranglega koma frá ykkur. Athugaðu aftur ef þið breytið því hvernig þið sendið póst."),
    almost: t("Fake email goes to spam, but can still reach people. One more step blocks it completely.", "Falsaður póstur fer í ruslpóst en getur samt borist fólki. Eitt skref í viðbót stöðvar hann alveg."),
    exposed: t("Scammers can send invoices and links that look like they come from you. The steps below fix this, one at a time.", "Svikarar geta sent reikninga og hlekki sem líta út fyrir að koma frá ykkur. Skrefin hér fyrir neðan laga þetta, eitt í einu."),
    unknown: t("A DNS lookup did not complete. Wait a moment and check again.", "DNS uppfletting kláraðist ekki. Bíddu aðeins og athugaðu aftur."),
  }[verdict];

  return { domain, verdict, headline, detail, provider, providerLabel, dnsHost, steps: ordered, done, total: ordered.length };
}

/** A ready-to-send note for whoever manages the domain's DNS. */
export function itMessage(plan: MailPlan, locale = "is"): string {
  const t = (en: string, is: string) => (locale === "en" ? en : is);
  const next = plan.steps.filter((s) => s.status !== "done" && (s.id === "spf" || s.id === "dkim" || s.id === "dmarc" || s.id === "lockdown"));
  const lines = [
    t("Hi,", "Hæ,"),
    "",
    t(
      `Could you help secure email for ${plan.domain}? These are the DNS changes needed (mail provider: ${plan.providerLabel}):`,
      `Gætir þú hjálpað mér að tryggja tölvupóstinn fyrir ${plan.domain}? Þetta eru DNS-breytingarnar sem þarf (póstþjónusta: ${plan.providerLabel}):`,
    ),
  ];
  for (const step of next) {
    lines.push("", `• ${step.title}`);
    for (const r of step.records)
      lines.push(`  ${r.type}  ${r.fqdn}  ${r.fromProvider ? r.value : `"${r.value}"`}`);
    if (!step.records.length) lines.push(`  ${step.how[0]}`);
  }
  lines.push(
    "",
    t(
      "DMARC starts at p=none (monitoring). Once everything works, we will move it to p=quarantine and then p=reject.",
      "DMARC byrjar í p=none (eftirlit). Þegar allt virkar færum við það í p=quarantine og síðan p=reject.",
    ),
    "",
    t(`Checked with dmark.is: https://www.dmark.is/en/`, `Athugað með dmark.is: https://www.dmark.is/is/`),
  );
  return lines.join("\n");
}
