# dmark-web

Dmark is a free email-authentication tool from Kastro, with optional separately quoted setup assistance. There is no paid Dmark plan or new hosted SPF flattening offering. The current scope and safe legacy retirement sequence are defined in [FREE_PRODUCT_PLAN.md](docs/FREE_PRODUCT_PLAN.md).

The free site includes live SPF/DMARC evidence, common and explicit-selector DKIM checks, default BIMI publication checks, and a per-domain checklist saved only in the current browser. No login, subscription or automatic DNS changes. Device-only checklists are user-declared progress and do not certify security.

Bilingual marketing site for dmark.is with a live public-domain email security check.

## Development and verification

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
```

Pages: `/is/` and `/en/`. Deploy using Vercel's standard Next.js preset. Leave the output directory at its framework default; do not override it to `out`. The pages are prerendered, while `POST /api/scan/` runs as a Node.js function. Static export is intentionally disabled to support this route.

## Live scanner

The browser sends a domain to the same-origin scan route. The route validates it, calls the fixed `https://lookup.kastro.is/api/lookup?q=...` endpoint from `AndriGitDev/whois-there`, validates its response, and returns only email-security evidence. It does not forward cookies, credentials, user IP headers, WHOIS data or unrelated infrastructure details. No runtime secrets are required.

The upstream deadline is 45 seconds; the function budget is 60 seconds. Responses are not cached. Upstream failures and rate limits produce explicit errors with no simulated fallback. Kastro Lookup currently rate-limits its general endpoint to 30 requests per minute per observed source; proxy requests can share that quota. For significant traffic, provide a dedicated mail-only upstream endpoint and a shared rate limiter. Do not forward caller-supplied IP headers to evade that limit.

### Rating scope

Ratings describe observed SPF/DMARC configuration, not whether an individual message is authenticated or whether spoofing is impossible. F indicates missing/non-enforcing DMARC or failed SPF posture; A requires assessed SPF and full reject enforcement with upstream green findings; B/C indicate remaining configuration concerns. An incomplete SPF chain, blocked target, or resolver warning suppresses the overall grade. Common-selector DKIM discovery is shown separately and does not lower the rating when no key is found. This is not a complete standards conformance validator, and upstream resolver limitations may yield incomplete results. Verify findings against authoritative DNS and message/report evidence before changes.

## Saved domains and supplementary DNS checks

`dmark:domains:v1` stores only domain names and manual checklist progress in localStorage. The UI supports up to 20 domains as a device storage bound. Users can remove a domain or clear the list; unavailable storage is reported and the checklist remains usable for the visit. There is no account sync or scheduled monitoring.

The scanner accepts one optional DKIM selector and performs bounded Node DNS TXT resolution for that selector and `default._bimi`. DNS timeouts are shown as unknown, distinct from a missing record. The new observations do not alter the SPF/DMARC grade and do not fetch remote logos, certificates or arbitrary URLs. They check basic publication only, not cryptographic or full standards validity. Public scan traffic still needs a shared deployment-level rate limiter for substantial use; the new lookups are bounded per request and do not forward caller IP headers.

## Analytics

The domain is sent to Kastro Lookup for the requested check, but is not included in scanner analytics events. Events permit only status and source. Optional build-time analytics settings: `DMARK_ANALYTICS_PROVIDER`, `DMARK_ANALYTICS_DOMAIN`, `DMARK_ANALYTICS_SCRIPT_URL`, and `DMARK_ANALYTICS_SITE_ID`. Service links lead to Kastro.

