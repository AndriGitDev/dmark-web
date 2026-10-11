# dmark-web

Dmark is a free email-authentication tool from Kastro, with optional separately quoted setup assistance. There is no paid Dmark plan or new hosted SPF flattening offering. The current scope and safe legacy retirement sequence are defined in [FREE_PRODUCT_PLAN.md](docs/FREE_PRODUCT_PLAN.md).

A bilingual public app for dmark.is: the domain workspace is the homepage. Visitors add domains, run live checks, inspect records and work through their checklist without signing up. Guest work is saved in a browser cookie. Optional free email-link accounts save domains and progress across devices. Checklist completion is user-declared progress, not a security certificate.

## Development and verification

```sh
npm ci
npm run dev
npm test
npm run lint
npm run build
npx playwright install chromium
npm run test:browser
```

Pages: `/is/` and `/en/`. Deploy using Vercel's standard Next.js preset. Leave the output directory at its framework default; do not override it to `out`. The pages are prerendered, while the scan and account routes run as Node.js functions. Static export is intentionally disabled to support this route.

## Live scanner

The browser sends a domain to the same-origin scan route. The route validates it, calls the fixed `https://lookup.kastro.is/api/lookup?q=...` endpoint from `AndriGitDev/whois-there`, validates its response, and returns only email-security evidence. It does not forward cookies, credentials, user IP headers, WHOIS data or unrelated infrastructure details. The anonymous scanner needs no runtime secrets.

The upstream deadline is 45 seconds; the function budget is 60 seconds. Responses are not cached. Upstream failures and rate limits produce explicit errors with no simulated fallback. Kastro Lookup currently rate-limits its general endpoint to 30 requests per minute per observed source; proxy requests can share that quota. For significant traffic, provide a dedicated mail-only upstream endpoint and a shared rate limiter. Do not forward caller-supplied IP headers to evade that limit.

### Rating scope

Ratings describe observed SPF/DMARC configuration, not whether an individual message is authenticated or whether spoofing is impossible. F indicates missing/non-enforcing DMARC or failed SPF posture; A requires assessed SPF and full reject enforcement with upstream green findings; B/C indicate remaining configuration concerns. An incomplete SPF chain, blocked target, or resolver warning suppresses the overall grade. Common-selector DKIM discovery is shown separately and does not lower the rating when no key is found. This is not a complete standards conformance validator, and upstream resolver limitations may yield incomplete results. Verify findings against authoritative DNS and message/report evidence before changes.

## Saved domains and supplementary DNS checks

Guest domains, six checklist flags and an optional DKIM selector are saved in the compact `dmark_workspace_v2` first-party cookie (one year, SameSite=Lax, Secure on HTTPS). It contains no scan results, credentials or email addresses. Browser cookie size can limit the workspace below the 20-domain ceiling; overflow is reported rather than silently truncating work. If cookies are blocked, the app remains usable for that visit. Existing `dmark:domains:v1` localStorage work is migrated only after cookie persistence succeeds.

## Optional account saving

Create account / sign in opens an email-link form inside the same app. `/api/account/*` proxies to the Go service; its session is mapped to a separate HttpOnly `dmark_account` cookie. Start, finish, save and logout require same-origin requests and a backend CSRF token. Login confirmation requires a deliberate POST and the browser that requested the link, so a mail scanner's GET cannot consume it. Guest domains are imported explicitly and cleared from the guest cookie only after the import is successfully saved. Saves use a version number; a stale save gets a conflict rather than overwriting another device's work. Account edits require Save workspace; full scan evidence remains visit-only. Compact last-score snapshots are cached locally for the dashboard; these are not synced to the account.

Deploy the companion dmark-app free-account change and PostgreSQL migration 00009 first. Configure the email sender and `FRONTEND_BASE_URL=https://dmark.is` on that backend. On Vercel, set `DMARK_ACCOUNT_API_URL` to the backend HTTPS origin (default `https://dmark.kastro.is`) and `DMARK_FRONTEND_ORIGIN` to the frontend origin (default `https://dmark.is`). For local development use `http://localhost:8080` and `http://localhost:3000`, with matching backend `FRONTEND_BASE_URL`. Preview domains need their own trusted frontend setting; never accept a browser-supplied callback URL. A missing/unavailable backend reports a real error while the guest workspace continues working.

There are no subscriptions, hosted SPF records, automatic DNS changes or scheduled monitoring. The backend currently uses in-memory 24-hour sessions, so a restart requires signing in again; the saved workspace remains in PostgreSQL. Use shared session/rate-limit storage before scaling account serving across replicas.

The scanner accepts one optional DKIM selector and performs bounded Node DNS TXT resolution for that selector and `default._bimi`. DNS timeouts are shown as unknown, distinct from a missing record. The new observations do not alter the SPF/DMARC grade and do not fetch remote logos, certificates or arbitrary URLs. They check basic publication only, not cryptographic or full standards validity. Public scan traffic still needs a shared deployment-level rate limiter for substantial use; the new lookups are bounded per request and do not forward caller IP headers.

## Analytics

The domain is sent to Kastro Lookup for the requested check, but is not included in scanner analytics events. Events permit only status and source. Optional build-time analytics settings: `DMARK_ANALYTICS_PROVIDER`, `DMARK_ANALYTICS_DOMAIN`, `DMARK_ANALYTICS_SCRIPT_URL`, and `DMARK_ANALYTICS_SITE_ID`. Service links lead to Kastro.


## Domain scores and guided improvements

Adding a domain starts its first live check. Dashboard cards show DNS readiness out of 100, the existing SPF/DMARC letter grade, last-check time and a refresh action. The improvement plan orders unmet checks, gives DNS names and provider-led remediation instructions, and explains how to verify each fix. Checklist notes never award points.

Readiness is a transparent product checklist: 20 points each for valid SPF within the receiver lookup limit, green SPF with fewer than eight lookups, a published DKIM key, valid DMARC, and green DMARC with full reject enforcement. Incomplete scans get no score. Explicit selector results take precedence over common-selector discovery. A missing discovered key means more verification is needed, not proof that no DKIM exists. Scores measure this DNS checklist, not sender alignment, key cryptography, real-message signatures or guaranteed protection. BIMI remains an optional branding goal outside the score. Enforcement guidance requires reviewing real senders and reports before increasing protection and never recommends weakening an existing policy.

The versioned `dmark:scores:v1` localStorage cache contains at most 20 domain/selector/score/grade/timestamp snapshots. Cached scores are labelled as saved observations, marked older after 24 hours and discarded on load after seven days. Selector changes hide incompatible results. Full findings are checked again before a personalised guide is shown after reload. Storage blocking leaves checking usable in memory.

## On-demand SPF flattening

The domain improvement plan includes an advanced SPF generator (`POST /api/spf/flatten/`). It resolves fresh TXT records and emits explicit `ip4`/`ip6` networks, preserving the root final policy and tracking each network's source. Supported records contain positive IP/include mechanisms, an explicit final `-all`/`~all`/`?all`, or a final redirect to a supported policy. Included non-pass policies do not become parent failures; redirects carry the target's terminal policy. Repeated dependencies are cached within one request, and identical networks are deduplicated without widening or merging ranges.

This deliberately restricted generator refuses a/mx/ptr/exists, macros, non-positive mechanisms, +all, exp/unknown modifiers, unreachable/ambiguous terms, missing/duplicate records and invalid addresses. DNS failures never return partial results. Generation is bounded to 40 TXT requests, 12 recursion levels, 100 expanded lookup terms, 200 source entries, a 12-second DNS deadline and a conservative 450-character output cap. TXT chunk formatting emits one record with multiple quoted strings where needed; it never creates multiple SPF records.

The app shows original/candidate records, generation time, dependency counts, provenance, copy controls and a downloadable snapshot. Generating or exporting does not change DNS, account state or the score. Users must review their senders, publish manually, recheck, and regenerate when provider IPs change. No hosted SPF endpoint, background refresh or automatic DNS editing is provided. An over-limit original may currently yield SPF permerror; generation preserves the supported authorisation rules, not that resource-limit failure. The displayed term count is the expanded include/redirect graph, not an observed message-delivery result.

SPF semantics reference: https://www.rfc-editor.org/rfc/rfc7208.html (sections 4.6.4, 5.1, 5.2, 5.6 and 6.1).
