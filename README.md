# dmark-web

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

## Analytics

The domain is sent to Kastro Lookup for the requested check, but is not included in scanner analytics events. Events permit only status and source. Optional build-time analytics settings: `DMARK_ANALYTICS_PROVIDER`, `DMARK_ANALYTICS_DOMAIN`, `DMARK_ANALYTICS_SCRIPT_URL`, and `DMARK_ANALYTICS_SITE_ID`. Service links lead to Kastro.
