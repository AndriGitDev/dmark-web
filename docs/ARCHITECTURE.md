# Architecture and limits

This document describes how the dmark web app checks a domain, what it stores, and where each feature stops. The [README](../README.md) covers setup and configuration.

## Live scanner

The browser sends a domain to the same-origin scan route. The route validates it, calls the fixed `https://lookup.kastro.is/api/lookup?q=...&scope=mail` endpoint of Kastro Lookup, validates the response, and returns only email-security evidence. The mail scope makes Lookup run DNS and mail-auth checks only, with no WHOIS, TLS, DNSSEC or GeoIP calls. The route does not forward cookies, credentials, user IP headers or unrelated infrastructure details, and stores nothing.

Checks typically complete in under two seconds. The upstream deadline is 45 seconds and the function budget is 60 seconds. Responses are not cached. Upstream failures and rate limits produce explicit errors with no simulated fallback.

All dmark scans reach Lookup from the dmark server, so they share one Lookup rate-limit bucket. The mail scope allows 120 requests per minute per source. Set the optional `KASTRO_LOOKUP_TOKEN` environment variable to a value listed in Lookup's `LOOKUP_SERVICE_TOKENS` to give dmark its own bucket of 1,200 requests per minute. Do not forward caller-supplied IP headers to evade limits.

### Supplementary DNS checks

The scanner accepts one optional DKIM selector and performs bounded Node.js DNS TXT resolution for that selector and for `default._bimi`. DNS timeouts are shown as unknown, distinct from a missing record. These observations do not alter the SPF/DMARC grade and do not fetch remote logos, certificates or arbitrary URLs. They check basic publication only, not cryptographic or full standards validity.

Public scan traffic still needs a shared deployment-level rate limiter for substantial use. The lookups are bounded per request and do not forward caller IP headers.

## Rating scope

Ratings describe observed SPF and DMARC configuration. They do not say whether an individual message is authenticated or whether spoofing is impossible.

- **F** indicates missing or non-enforcing DMARC, or failed SPF posture.
- **A** requires assessed SPF and full reject enforcement with green upstream findings.
- **B** and **C** indicate remaining configuration concerns.

An incomplete SPF chain, blocked target or resolver warning suppresses the overall grade. Common-selector DKIM discovery is shown separately and does not lower the rating when no key is found.

This is not a complete standards conformance validator, and upstream resolver limitations may yield incomplete results. Verify findings against authoritative DNS and message or report evidence before making changes.

## Verdicts, scores and guided improvements

Adding a domain starts its first live check. Domain cards show a plain verdict (protected, partly protected or not protected), the last-check time and a refresh action. The fix plan orders unmet steps, gives DNS names and provider-led instructions, and explains how to verify each fix. Checklist notes never award points.

The technical details for a domain also show DNS readiness out of 100. Readiness is a transparent product checklist with 20 points for each of:

1. valid SPF within the receiver lookup limit;
2. green SPF with fewer than eight lookups;
3. a published DKIM key;
4. valid DMARC;
5. green DMARC with full reject enforcement.

Incomplete scans get no score. Explicit selector results take precedence over common-selector discovery. A missing discovered key means more verification is needed, not proof that no DKIM exists. Scores measure this DNS checklist, not sender alignment, key cryptography, real-message signatures or guaranteed protection. BIMI remains an optional branding goal outside the score. Enforcement guidance requires reviewing real senders and reports before increasing protection, and never recommends weakening an existing policy.

## Browser storage

dmark has no accounts. It never asks for an email address, never creates a session and has no account API routes.

| Where | Key | Contents |
| --- | --- | --- |
| First-party cookie | `dmark_workspace_v2` | Saved domains, six checklist flags and an optional DKIM selector per domain. One year, `SameSite=Lax`, `Secure` on HTTPS. |
| localStorage | `dmark:scores:v1` | At most 20 snapshots of domain, selector, score, grade and timestamp. |

The cookie contains no scan results, credentials or email addresses. Browser cookie size can limit the workspace below the 20-domain ceiling; overflow is reported and never silently truncates saved work. If cookies are blocked, the app remains usable for that visit. Work saved under the older `dmark:domains:v1` localStorage key is migrated only after cookie persistence succeeds.

Cached scores are labelled as saved observations, marked older after 24 hours and discarded on load after seven days. Selector changes hide incompatible results. Full findings are checked again before a personalised guide is shown after reload. If storage is blocked, checking still works in memory.

Clearing the `dmark_workspace_v2` cookie and the `dmark:scores:v1` localStorage entry removes everything dmark knows about a visitor's workspace.

## Analytics

The domain is sent to Kastro Lookup for the requested check, but it is not included in analytics events. Events carry only a status and a source from fixed allowlists. Analytics load only when the build-time settings listed in the README are valid. Policy and contact links lead to Kastro, the site operator.

## On-demand SPF flattening

The technical details include an advanced SPF generator (`POST /api/spf/flatten/`). It resolves fresh TXT records and emits explicit `ip4` and `ip6` networks, preserving the root final policy and tracking each network's source.

Supported records contain positive IP and include mechanisms, an explicit final `-all`, `~all` or `?all`, or a final redirect to a supported policy. Included non-pass policies do not become parent failures, and redirects carry the target's terminal policy. Repeated dependencies are cached within one request, and identical networks are deduplicated without widening or merging ranges.

The generator is deliberately restricted. It refuses:

- `a`, `mx`, `ptr` and `exists` mechanisms;
- macros and non-positive mechanisms;
- `+all`;
- `exp` and unknown modifiers;
- unreachable or ambiguous terms;
- missing or duplicate records and invalid addresses.

DNS failures never return partial results. Generation is bounded to 40 TXT requests, 12 recursion levels, 100 expanded lookup terms, 200 source entries, a 12-second DNS deadline and a conservative 450-character output cap. TXT chunk formatting emits one record with multiple quoted strings where needed; it never creates multiple SPF records.

The app shows the original and candidate records, generation time, dependency counts, provenance, copy controls and a downloadable snapshot. Generating or exporting does not change DNS or the score. Users must review their senders, publish manually, recheck, and regenerate when provider IP addresses change. There is no hosted SPF endpoint, background refresh or automatic DNS editing.

An over-limit original record may currently yield an SPF permerror. Generation preserves the supported authorisation rules, not that resource-limit failure. The displayed term count is the expanded include and redirect graph, not an observed message-delivery result.

SPF semantics follow [RFC 7208](https://www.rfc-editor.org/rfc/rfc7208.html), sections 4.6.4, 5.1, 5.2, 5.6 and 6.1.

## Verification

`npm run test:launch` verifies the production build output in both languages: social images, icons, structured content, sitemap, indexing directives and declared color contrast. Run it after `npm run build`.

The browser suite includes axe-core checks for WCAG A and AA rules, keyboard behavior, invalid-input focus, responsive overflow, the privacy card, and the scan and SPF flows. It fails if the app ever calls an account route. Browser checks use mocked DNS responses, so passing them does not confirm the deployed Lookup service.

[LAUNCH_READINESS.md](LAUNCH_READINESS.md) records the launch, discovery and accessibility work in more detail.
