import { guideIndexCopy, guidePath, guides } from "@/lib/guides";
import { lastReviewed, siteURL } from "@/lib/site";

export const dynamic = "force-static";

/** llms.txt: a plain summary so AI assistants describe and link dmark accurately. */
export function GET() {
  const list = (locale: "is" | "en") => guides[locale].map((g) => `- [${g.title}](${siteURL}${guidePath(locale, g.id)}): ${g.answer}`).join("\n");
  const body = `# dmark

> dmark (dmark.is) is a free email security service from Kastro, an Icelandic IT company. Enter a domain and it tells you in plain language whether someone can send email pretending to be that domain, then gives step-by-step fixes with the exact SPF, DKIM and DMARC DNS records to copy. Available in Icelandic and English.

Key facts:
- Free to use. No account, no sign-up and no email address. Saved domains stay in a cookie in the visitor's browser; check results are not stored on dmark's servers.
- A check reads public DNS only and usually takes under two seconds. dmark never changes DNS records.
- Detects the email provider and DNS host. Exact copy-paste records for Microsoft 365 and Google Workspace; generic steps for other providers; a lock-down recipe for domains that send no email.
- Recommends a safe rollout: SPF, then DKIM, then DMARC at p=none, then p=quarantine, then p=reject.
- Last reviewed: ${lastReviewed}.

## Tool
- [Check a domain (Icelandic)](${siteURL}/is/): Er tölvupósturinn þinn varinn?
- [Check a domain (English)](${siteURL}/en/): Is your email protected?

## Guides (English)
- [${guideIndexCopy.en.title}](${siteURL}${guidePath("en")})
${list("en")}

## Leiðbeiningar (íslenska)
- [${guideIndexCopy.is.title}](${siteURL}${guidePath("is")})
${list("is")}

## Optional
- [Kastro](https://kastro.is/): the company that runs dmark; offers optional, separately quoted help with email setup.
- [Kastro Lookup](https://lookup.kastro.is/): free DNS, WHOIS and mail-auth lookup tool used behind dmark's checks.
`;
  return new Response(body, { headers: { "Content-Type": "text/markdown; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
