# Dmark Dynamic SPF Flattener Plan

This is the current implementation direction for Dmark's automated SPF flattening service.

## Founder Prep

Before implementation starts, provision the DNS control plane in Bunny.net:

- Create a dedicated Bunny DNS zone for `route.dmark.is`.
- Do not use the primary `dmark.is` zone for client routing.
- If `dmark.is` DNS is hosted elsewhere, delegate `route.dmark.is` to Bunny with NS records at the current DNS host.
- Generate a Bunny account API key and store it only in server-side environment variables.
- Capture the Bunny DNS zone ID for `route.dmark.is`.

Expected backend environment variables:

```env
BUNNY_DNS_API_KEY=...
BUNNY_DNS_ZONE_ID=...
DMARK_SPF_ROUTE_ZONE=route.dmark.is
```

## Architecture

Dmark will use CNAME delegation plus Bunny.net DNS API updates instead of running custom authoritative DNS.

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

Build a server-side TypeScript worker utility using `dns.promises.resolveTxt`.

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
5. Dashboard shows the required client DNS delegation:

```txt
_spf.yourdomain.com CNAME acme.route.dmark.is
```

## Implementation Phases

1. Add persisted flattener config: client route label, include domains, enabled tools, Bunny record ID, last generated SPF, sync status.
2. Implement recursive SPF include resolver with depth limit, loop detection, tests, and resolution error reporting.
3. Implement SPF string generation and TXT chunking tests.
4. Implement Bunny DNS client behind a server-only interface.
5. Add sync worker and scheduled resync.
6. Wire dashboard toggles and onboarding copy.
7. Add alert/change-plan integration for stale, failed, or blocked flattener states.

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
