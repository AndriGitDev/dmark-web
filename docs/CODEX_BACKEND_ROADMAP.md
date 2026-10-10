# Codex Backend Roadmap For Dmark

> Historical scope, superseded 2026-10-10 by the [free Kastro product plan](FREE_PRODUCT_PLAN.md). Paid tiers, hosted SPF flattening and earlier GA promises below are not current product commitments. Runtime retirement must follow the dependency migration plan; historical implementation evidence remains useful.

## Completion Note - 2026-05-29

This backend roadmap is archived. The dashboard contract endpoints documented below are implemented in `dmark-app` and consumed by `dmark-web`, so the remaining sections are historical reference only.

## Current State

- `dmark-web` is live as the frontend and marketing repo.
- The dashboard contract endpoints documented below are implemented in `dmark-app` and consumed by `dmark-web` through server-side proxy routes.
- `dmark-app` still owns backend product work and documents authenticated `/api/v1` contracts in `docs/API.md`.
- The backend has domain, reporter, alert, status, billing, API key, team, privacy, webhook, and audit foundations.
- The SPF flattener remains future work and is tracked separately in `docs/CODEX_SPF_FLATTENER_PLAN.md`.

## Goal

Ship the backend API surface needed for a real Dmark dashboard:

- Protected domain fleet state.
- Per-domain recheck and history.
- DNS remediation/change plans.
- Reporter sender inventory.
- Alert acknowledge/mute lifecycle.
- Settings persistence.
- Executive report/export data.
- Production observability and QA gates.

## Phase 1: Stabilize Dashboard API Contracts

Create a frontend-ready API contract layer in `dmark-app`.

Endpoints:

```http
GET  /api/v1/dashboard
GET  /api/v1/dashboard/domains
GET  /api/v1/dashboard/domains/{id}
POST /api/v1/dashboard/domains/{id}/recheck
GET  /api/v1/dashboard/domains/{id}/change-plan
GET  /api/v1/dashboard/domains/{id}/reporter
GET  /api/v1/dashboard/alerts
POST /api/v1/dashboard/alerts/{id}/ack
POST /api/v1/dashboard/alerts/{id}/mute
GET  /api/v1/dashboard/settings
POST /api/v1/dashboard/settings
```

Acceptance:

- Responses are JSON only.
- IDs are stable and opaque.
- Timestamps are RFC3339 UTC.
- Frontend terms match Dmark language: Protected domains, Reporter, Alerts, Change plan, Enforcement ladder.
- API tests cover happy path, auth failure, missing domain, and validation errors.
- `docs/API.md` is updated with exact request/response examples.

Verification:

```sh
go test ./internal/api ./internal/web ./internal/domains ./internal/reporter ./internal/alerts
```

## Phase 2: Domain Fleet And Recheck Backend

Back the dashboard domain list with real stored domains and latest checks.

Work:

- Add dashboard response mapping from existing `domains.Domain`, `domains.Check`, scanner summary, and sales audit.
- Compute:
  - score
  - status: `protected`, `monitoring`, `needs-work`
  - DMARC policy
  - SPF lookup count
  - DKIM coverage
  - alignment rate when Reporter data exists
  - unknown sender count when Reporter data exists
  - next action
- Implement recheck as an authenticated command that queues or performs a scan and records the result.
- Return `202 Accepted` for queued rechecks with a job/check ID.

Acceptance:

- `GET /api/v1/dashboard/domains` can replace `protectedDomains` in `dmark-web`.
- Recheck does not block indefinitely on slow DNS.
- Recheck failures are persisted as operator-visible findings.
- Duplicate rapid rechecks are rate-limited per domain.

Verification:

```sh
go test ./internal/domains ./internal/jobs ./internal/web
```

## Phase 3: DNS Change Plan And Remediation Engine

Produce backend-owned remediation records instead of hardcoded frontend copy.

SPF flattening has two layers:

- The current dashboard contract should expose backend-owned remediation/change-plan rows from scanner evidence.
- The actual dynamic SPF flattener is a separate Bunny.net-backed DNS engine documented in `docs/CODEX_SPF_FLATTENER_PLAN.md`.

Work:

- Add a recommendation/change-plan package if no suitable one exists.
- Generate SPF flattening recommendations from scanner results.
- Treat SPF recommendations as advisory until the dynamic DNS engine exists.
- Generate DMARC journey recommendations using existing `internal/dmarcjourney`.
- Include DKIM/BIMI follow-up records where scanner evidence supports it.
- Mark each change as `ready`, `review`, `waiting`, or `blocked`.
- Include provider-safe copyable record text.

Acceptance:

- `GET /api/v1/dashboard/domains/{id}/change-plan` returns staged DNS changes.
- Every change includes evidence, risk, rollback note, and record text.
- No recommendation claims a DNS change is safe without current evidence.
- Unit tests cover SPF over 10 lookups, DMARC `p=none`, quarantine progression, reject readiness, and missing evidence.

Verification:

```sh
go test ./internal/recommendations ./internal/dmarcjourney ./internal/scanner
```

## Phase 3B: Dynamic SPF Flattener And Bunny DNS Engine

Build the automated SPF flattening service described in `docs/CODEX_SPF_FLATTENER_PLAN.md`.

Work:

- Store per-domain flattener configuration and selected sender tools/includes.
- Resolve SPF include chains recursively with max-depth and loop protection.
- Generate deduplicated `ip4:` and `ip6:` SPF records.
- Split long TXT record values into provider-safe chunks.
- Publish `*.route.dmark.is` TXT records through Bunny.net's DNS API.
- Require clients to CNAME `_spf.<client-domain>` to `<client>.route.dmark.is`.
- Resync active flattened records every 12 to 24 hours and immediately after config changes.
- Avoid Bunny API writes when the generated SPF output has not changed.
- Surface failed, stale, or blocked flattener states in dashboard alerts and change plans.

Acceptance:

- A protected domain can enable a provider such as HubSpot and receive a concrete `_spf` CNAME instruction.
- The backend publishes or updates the matching Bunny TXT record without exposing the Bunny API key.
- Recursive includes are flattened deterministically and safely.
- Circular includes, DNS failures, excessive depth, and overlarge output fail closed with operator-visible errors.
- Scheduled sync keeps published records current.

Verification:

```sh
go test ./internal/recommendations ./internal/domains ./internal/web
```

If the flattener worker is implemented in TypeScript instead of Go, add the equivalent Node test command here once the package exists.

## Phase 4: Reporter Dashboard Data

Make the Reporter tab real.

Work:

- Expose aggregate Reporter metrics for a domain:
  - report volume
  - aligned message percentage
  - reporter org count
  - failures
  - p=reject candidates
- Expose sender inventory rows:
  - provider/source
  - volume
  - aligned percentage
  - expected/unknown classification
  - trend
  - risk
- Support `?filter=unknown` and CSV export.
- Preserve raw XML privacy boundaries.

Acceptance:

- `GET /api/v1/dashboard/domains/{id}/reporter` can replace the Reporter mock tab.
- Unknown sender filter is server-supported.
- CSV export is deterministic and omits secrets/raw XML.
- Empty Reporter state returns clear setup guidance, not a 500.

Verification:

```sh
go test ./internal/reporter ./internal/attribution ./internal/store/ch ./internal/web
```

## Phase 5: Alert Lifecycle

Wire the dashboard alert queue to backend lifecycle state.

Work:

- Normalize findings from drift, scanner failures, unknown senders, and Reporter health into dashboard alerts.
- Add acknowledge and mute actions.
- Persist actor, timestamp, action, and reason where available.
- Ensure muted alerts can re-open when fresh evidence materially changes.

Acceptance:

- `GET /api/v1/dashboard/alerts` returns only active operator alerts by default.
- `POST /api/v1/dashboard/alerts/{id}/ack` removes the alert from active queue and writes audit.
- `POST /api/v1/dashboard/alerts/{id}/mute` suppresses the alert according to policy and writes audit.
- Audit log can explain who did what and when.

Verification:

```sh
go test ./internal/alerts ./internal/drift ./internal/audit ./internal/web
```

## Phase 6: Settings Persistence

Store the dashboard automation settings currently mocked in the frontend.

Settings:

- Require 95 percent alignment before `p=reject`.
- Pause automation when unknown senders spike.
- Auto-generate monthly executive reports.
- Notification channels.

Acceptance:

- Settings are organization-scoped.
- Invalid thresholds are rejected.
- Updates write audit events.
- Defaults are safe for a new tenant.

Verification:

```sh
go test ./internal/domains ./internal/notifier ./internal/audit ./internal/web
```

## Phase 7: Auth And Frontend Integration Boundary

Make `dmark-web` able to call the authenticated dashboard API safely.

Work:

- Decide whether `dmark-web` uses:
  - server-side API token proxy routes, or
  - browser session auth against `dmark-app`.
- Prefer server-side proxy routes in `dmark-web` until cross-origin session auth is fully specified.
- Add CORS only for explicit frontend origins.
- Add token scope guidance for dashboard read/write actions.
- Add a local dev profile that can use seeded data without production credentials.

Acceptance:

- No API token is exposed to browser JavaScript.
- Scope checks reject missing or under-scoped tokens.
- Frontend can fetch dashboard data locally and in Coolify.
- Public scanner remains unauthenticated and rate-limited.

Verification:

```sh
go test ./internal/auth ./internal/apikeys ./internal/web
```

## Phase 8: Production QA And Observability

Make the backend shippable, not just implemented.

Work:

- Add structured logs for dashboard API requests and recheck jobs.
- Add metrics for scan latency, queue depth, alert actions, Reporter freshness, and API failures.
- Add smoke scripts for live public scan and authenticated dashboard reads.
- Add fixture seed script for demo tenant data.
- Update Coolify docs with required env vars.

Acceptance:

- `make test` or documented equivalent is green.
- Live smoke covers public scan, audit claim, dashboard domains, Reporter, alerts, and settings.
- Coolify deploy docs are enough for a fresh deploy.
- Failure modes return useful JSON errors.

Verification:

```sh
go test ./...
go test -race ./internal/web ./internal/domains ./internal/reporter ./internal/alerts
```

## Frontend Handoff Contract

Once Phase 1 and Phase 2 land, update `dmark-web`:

- Replace `lib/dashboard.ts` fixtures with typed fetchers.
- Add Next proxy routes for dashboard endpoints.
- Preserve mock fallback only under explicit dev env, not silently in production.
- Keep the current dashboard interaction model: recheck, copy, export, filter, acknowledge, mute, and settings toggles.

## Suggested Codex Prompt

```text
Continue Dmark backend work in /Users/andri/Documents/GitHub/dmark-app using the roadmap in /Users/andri/Documents/GitHub/dmark-web/docs/CODEX_BACKEND_ROADMAP.md. Start with Phase 1 and Phase 2 only: stabilize frontend-ready dashboard API contracts, implement protected-domain fleet responses, and add authenticated recheck. Keep public scan/audit endpoints compatible with dmark-web. Update docs/API.md and run the listed Go tests before stopping.
```

