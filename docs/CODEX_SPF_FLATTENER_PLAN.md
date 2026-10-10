# Dmark Dynamic SPF Flattener Plan

> Historical scope, superseded 2026-10-10 by the [free Kastro product plan](FREE_PRODUCT_PLAN.md). Paid tiers, hosted SPF flattening and earlier GA promises below are not current product commitments. Runtime retirement must follow the dependency migration plan; historical implementation evidence remains useful.

This frontend-facing plan is superseded for backend implementation details by `dmark-app/docs/SPF_FLATTENER_BUNNY_PLAN.md`. SPF flattening is now GA scope, not a future/nice-to-have. This document remains as the `dmark-web` UI handoff: the frontend should render SPF route status and onboarding instructions through server-side dashboard proxy routes, while all resolver, worker, Bunny.net DNS, secrets, and publication logic lives in `dmark-app`.

## Founder Prep

The DNS control plane uses the existing Bunny parent zone for `dmark.is`.

- Use Bunny zone ID `801471` for the parent `dmark.is` zone.
- Publish route records as relative names in the parent zone, for example `customer-example.route`, resolving publicly as `customer-example.route.dmark.is`.
- Do not delegate `route.dmark.is` to the same Bunny nameservers while `dmark.is` is also on Bunny; previous testing produced lame delegation/SERVFAIL.
- Generate a Bunny account API key with the minimum DNS permissions available and store it only in server-side backend environment variables.

Expected backend environment variables:

```env
BUNNY_DNS_API_KEY=...
BUNNY_DNS_ZONE_ID=801471
DMARK_SPF_DNS_ZONE=dmark.is
DMARK_SPF_ROUTE_ZONE=route.dmark.is
DMARK_SPF_ROUTE_TTL=300
```

## Architecture

Dmark will use customer-side CNAME records plus Bunny.net DNS API updates in the parent `dmark.is` zone instead of running custom authoritative DNS or relying on a same-provider child-zone delegation.

Client DNS shape:

```txt
_spf.acme.com CNAME acme.route.dmark.is
```

Dmark-owned DNS shape:

```txt
acme.route.dmark.is TXT "v=spf1 ip4:... ip6:... ~all"
```

The app stores each protected domain's enabled sender tools or raw SPF include domains. A background worker resolves those includes, flattens them into IP mechanisms, and publishes the resulting TXT record to Bunny.

## Flattener Worker

Build a server-side Go resolver/sync service in `dmark-app` (canonical plan: `docs/SPF_FLATTENER_BUNNY_PLAN.md`). `dmark-web` should only consume the resulting dashboard API/proxy contract.

Input:

- Client route label, for example `acme`.
- Include domains, for example `_spf.google.com` and provider-specific HubSpot SPF hosts.

Resolution rules:

- Resolve TXT records for each include domain.
- Select SPF records beginning with `v=spf1`.
- Extract `ip4:` and `ip6:` mechanisms.
- Recursively follow `include:` mechanisms.
- Cap recursion depth at 10.
- Track visited domains to prevent include loops.
- Deduplicate final IP mechanisms.
- Preserve enough trace/evidence to explain which provider produced each mechanism.

Initial non-goals:

- Do not claim safe removal of a provider without current evidence.
- Do not publish client-facing SPF changes when resolution errors make the flattened result incomplete.
- Do not expose the Bunny API key to browser JavaScript.

## SPF String Generation

Output format:

```txt
v=spf1 ip4:192.0.2.10 ip4:198.51.100.0/24 ip6:2001:db8::/32 ~all
```

TXT handling:

- Keep the SPF policy as one TXT record.
- Split long TXT values into multiple quoted chunks in the same TXT record payload when any string segment would exceed 255 characters.
- Keep an upper bound on final record size and return a blocked state if the flattened record becomes too large to publish safely.

## Bunny.net DNS API

Use Bunny's Core Platform API:

- Base URL: `https://api.bunny.net`
- Records endpoint: `/dnszone/{ZONE_ID}/records`
- Headers:
  - `AccessKey: <BUNNY_DNS_API_KEY>`
  - `Content-Type: application/json`

Record creation payload shape:

```json
{
  "Type": 3,
  "Name": "acme",
  "Value": "v=spf1 ip4:192.0.2.10 ~all",
  "Ttl": 300
}
```

Implementation notes:

- Verify Bunny's current update-record endpoint syntax before coding.
- List existing records for the zone and find a TXT record matching the client route label.
- Create the record if absent.
- Update the existing record only when the generated SPF value changed.
- Persist the last generated value, publish status, Bunny record ID, and last sync error.

## Continuous Sync

Provider IP ranges change, so this is not a one-time task.

Worker cadence:

- Run immediately after a user changes enabled sender tools.
- Run for all active flattener clients every 12 to 24 hours.
- Compare the generated value with the stored value before calling Bunny.
- Surface publish failures in the dashboard change plan and alerts.

Potential schedulers:

- Existing backend job queue if available.
- Trigger.dev, Inngest, Vercel Cron, AWS EventBridge, or a conventional cron runner.

## Client Flow

1. User enables a sender tool such as HubSpot in the dashboard.
2. Backend saves the selected include domains for that protected domain.
3. Backend triggers the flattener worker immediately.
4. Worker publishes `acme.route.dmark.is` to Bunny.
5. Backend resolves the protected domain's authoritative nameservers and detects the DNS provider when possible.
6. Dashboard shows the required client DNS delegation plus provider-specific instructions and a DNS-dashboard deep link where the provider offers a stable management URL:

```txt
_spf.yourdomain.com CNAME acme.route.dmark.is
```

## Implementation Phases

1. Add persisted flattener config: client route label, include domains, enabled tools, Bunny record ID, last generated SPF, sync status.
2. Implement recursive SPF include resolver with depth limit, loop detection, tests, and resolution error reporting.
3. Implement SPF string generation and TXT chunking tests.
4. Implement Bunny DNS client behind a server-only interface.
5. Add sync worker and scheduled resync.
6. Add backend nameserver/provider detection with fixture-backed mappings for Icelandic providers, global providers, ambiguous matches, and unknown fallback.
7. Wire dashboard toggles, onboarding copy, provider-specific DNS steps, and deep links through server-side proxy routes.
8. Add alert/change-plan integration for stale, failed, or blocked flattener states.

## Verification

Backend tests should cover:

- `ip4:` and `ip6:` extraction.
- Nested `include:` resolution.
- Include loop detection.
- Max-depth protection.
- Deduplication.
- Multiple TXT strings in one SPF record.
- No SPF record and multiple SPF record errors.
- TXT segment chunking at 255 characters.
- Bunny create/update paths with a fake HTTP client.
- No Bunny API call when generated output is unchanged.
- Provider detection from authoritative nameservers, including Icelandic providers such as ISNIC, 1984, Opin Kerfi, Origo, and Advania; global providers; ambiguous matches; and unknown fallback.
- Provider-specific instruction and deep-link rendering for SPF route CNAME, SPF TXT, and DMARC TXT records.

