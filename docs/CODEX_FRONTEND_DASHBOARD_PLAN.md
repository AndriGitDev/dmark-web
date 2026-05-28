# Codex Frontend Dashboard Integration Plan

## Next Agent Handoff - 2026-05-28

This is the current handoff for the next frontend agent. The dashboard integration is now substantially implemented in `dmark-web`, including the new Brand Risk endpoint, but it still needs live-backend QA and visual/browser validation once the in-app browser connector is available.

### Completed In Latest Pass

- Added server-only dashboard API support for `GET /api/v1/dashboard/domains/{id}/brand-risk`.
- Added Brand Risk backend types, UI view models, mappers, mock fixtures, and client fetch helper.
- Added a dashboard `Brand Risk` tab with:
  - Email-auth findings.
  - Defender lookalike rows.
  - DNS evidence badges for `A/AAAA` and `MX`.
  - An `Include inactive` toggle that calls `include_inactive=true`.
  - Explicit inactive candidate labeling so inactive rows are not presented as confirmed threats.
- Updated the dashboard API client to read the recommended server-only env names:
  - `DMARK_API_BASE_URL`
  - `DMARK_API_TOKEN`
  - legacy aliases `DMARK_APP_API_BASE_URL` and `DMARK_APP_API_TOKEN` still work.
- Added `DMARK_API_TIMEOUT_MS`, defaulting to `10000`.
- Expanded Change Plan UI to show journey state, next action, DNS record name/type/text, evidence, risk, rollback notes, and copy buttons.
- Expanded Reporter summary metrics with failures and reject candidates.
- Updated Settings UI to use:
  - Numeric `require_alignment_before_reject` threshold from `1..100`.
  - Toggles for unknown-sender spike pause and monthly reports.
  - Checkboxes for `email`, `slack`, and `webhook` notification channels.
- Added a dependency-free Node test harness with `npm test` covering:
  - Dashboard API token attachment and env aliases.
  - Backend error JSON mapping.
  - Dashboard summary/domain mapping.
  - Brand Risk DNS/MX and inactive-candidate semantics.
  - Settings threshold clamping.
- Updated `README.md` with the new env names.

### Files Changed In Latest Pass

- `lib/dashboard-api.ts`
- `lib/dashboard.ts`
- `components/dmark-dashboard.tsx`
- `app/api/dashboard/[[...path]]/route.ts`
- `test/dashboard-model.test.mjs`
- `package.json`
- `README.md`
- `docs/CODEX_FRONTEND_DASHBOARD_PLAN.md`

### Verification Already Run

From `/Users/andri/Documents/GitHub/dmark-web`:

```sh
npm run lint
npm test
npm run build
git diff --check
```

All passed.

Mock local smoke checks also passed after starting the frontend with `DMARK_DASHBOARD_MOCK=1`:

```sh
curl -I http://127.0.0.1:3000/dashboard
curl 'http://127.0.0.1:3000/api/dashboard/domains/northwind/brand-risk?tld=is&limit=25'
curl 'http://127.0.0.1:3000/api/dashboard/domains/northwind/brand-risk?tld=is&limit=25&include_inactive=true'
```

The default Brand Risk mock response returns only the active DNS/MX evidence row. The `include_inactive=true` response also returns an inactive `Info` homoglyph candidate with no DNS/MX evidence.

### Known Blocker

Visual QA was not completed because the Codex Browser plugin was loaded but no in-app browser instance was registered:

```json
{
  "browserListAfterReset": [],
  "iabResult": {
    "ok": false,
    "message": "Browser is not available: iab"
  }
}
```

This appears to be a host/session attachment issue, not a repo issue. Once the host registers the in-app browser, verify `agent.browsers.list()` returns an entry or `agent.browsers.get("iab")` succeeds, then run visual passes.

### Next Steps For The Next Agent

1. Run live backend QA.

   Start the backend:

   ```sh
   cd /Users/andri/Documents/GitHub/dmark-app
   make dev
   ```

   Start the frontend:

   ```sh
   cd /Users/andri/Documents/GitHub/dmark-web
   DMARK_API_BASE_URL=http://localhost:8080 \
   DMARK_API_TOKEN=meil_from_backend_seed_or_local_config \
   DMARK_DASHBOARD_MOCK=0 \
   npm run dev
   ```

   Open `/dashboard` and verify the browser only calls frontend-owned `/api/dashboard/*` routes. The backend token must never appear in browser network requests or client bundles.

2. Verify all live dashboard endpoints.

   Required live checks:

   - Dashboard summary loads.
   - Domain list renders status, score, DMARC policy, DKIM coverage, alignment, unknown senders, last checked, and next action.
   - Manual recheck returns `202` and displays queued/completed state.
   - Change Plan renders journey state, next action, and DNS changes.
   - Reporter handles populated inventory, `filter=unknown`, CSV export, no reports, and `setup_guidance`.
   - Brand Risk renders email-auth findings and lookalikes from `?tld=is&limit=25`.
   - Brand Risk `include_inactive=true` shows inactive `Info` rows as inactive candidates, not confirmed threats.
   - Alerts active list renders, acknowledge works, mute works.
   - Settings load and save with backend 400 errors displayed inline.

3. Do visual QA after fixing the in-app browser attachment.

   Viewports to check:

   - Desktop around `1440x900`.
   - Tablet around `1024x768`.
   - Mobile around `390x844`.

   Screens to inspect:

   - Overview.
   - Domains with long DNS record text in Change Plan.
   - Reporter with populated and empty states.
   - Brand Risk with active-only and inactive-included modes.
   - Alerts.
   - Settings.

   Pay special attention to long DNS records, evidence text, lookalike domains, and table overflow on mobile.

4. Complete accessibility pass.

   Check keyboard navigation across tabs, buttons, settings inputs, notification checkboxes, copy buttons, and alert actions. Confirm focus states remain visible and table scroll containers are usable.

5. Add interaction tests when a browser runner is available.

   The repo now has `npm test` for mapper/client logic but no React/browser test stack. Add Playwright or the team’s preferred browser runner only after confirming project preference. Suggested coverage:

   - Dashboard renders summary metrics.
   - Domain table/list renders status and next action.
   - Recheck action shows queued response.
   - Brand Risk renders findings and DNS/MX evidence.
   - Brand Risk inactive candidates are labeled inactive and not as confirmed threats.
   - Reporter empty state renders setup guidance.
   - Settings validates threshold and displays backend 400 errors.

6. Revisit product routing.

   The current dashboard is a tabbed single screen. The original brief suggested `/dashboard/domains/[id]` for protected-domain detail. Decide whether to keep the operational tabbed layout or add the detail route. If adding it, reuse existing fetchers and avoid duplicating backend token logic in client components.

7. Final release checks.

   Before shipping, run:

   ```sh
   npm run lint
   npm test
   npm run build
   git diff --check
   ```

   Then run live backend/browser QA again with `DMARK_DASHBOARD_MOCK=0`.

---

This plan is for completing the `dmark-web` frontend integration against the authenticated dashboard API now implemented in `/Users/andri/Documents/GitHub/dmark-app`.

## Current State

- `dmark-web` now has a backend-backed dashboard integration path.
- Dashboard initial state is loaded server-side in `app/dashboard/page.tsx`.
- Client interactions remain in `components/dmark-dashboard.tsx` for tabs, filters, recheck buttons, alert actions, settings toggles, notices, and exports.
- Dashboard browser code calls `/api/dashboard/*`; the server route proxies authenticated requests to `dmark-app`.
- Mock dashboard fixtures still exist in `lib/dashboard.ts`, but only behind explicit `DMARK_DASHBOARD_MOCK=1`.
- Existing server proxy patterns also exist for public backend calls:
  - `app/api/scan/route.ts`
  - `app/api/upgrade/route.ts`
- The backend now exposes frontend-ready authenticated dashboard contracts:
  - `GET /api/v1/dashboard`
  - `GET /api/v1/dashboard/domains`
  - `GET /api/v1/dashboard/domains/{id}`
  - `POST /api/v1/dashboard/domains/{id}/recheck`
  - `GET /api/v1/dashboard/domains/{id}/change-plan`
  - `GET /api/v1/dashboard/domains/{id}/reporter`
  - `GET /api/v1/dashboard/alerts`
  - `POST /api/v1/dashboard/alerts/{id}/ack`
  - `POST /api/v1/dashboard/alerts/{id}/mute`
  - `GET /api/v1/dashboard/settings`
  - `POST /api/v1/dashboard/settings`
- Exact backend request/response examples live in `/Users/andri/Documents/GitHub/dmark-app/docs/API.md`.

## Goal

Keep `dmark-web` live-backend ready without exposing backend API tokens to browser JavaScript.

Completed:

- Server-only dashboard backend client and types.
- Catch-all Next dashboard proxy route.
- Server-fetched initial dashboard state.
- Client actions for recheck, Reporter filter/export, alert acknowledge/mute, and settings save.
- Explicit mock mode only when `DMARK_DASHBOARD_MOCK=1`.

Remaining:

- Verify against a seeded `dmark-app` backend.
- Keep UI states aligned with backend error and empty-state behavior as the API matures.
- Add tests where dashboard interactions stabilize.

## Required Environment

Add these frontend environment variables:

```env
DMARK_APP_API_BASE_URL=http://localhost:8080
DMARK_APP_API_TOKEN=meil_replace_with_backend_api_key
DMARK_DASHBOARD_MOCK=0
```

Production/Coolify should set:

```env
DMARK_APP_API_BASE_URL=https://dmark-backend.example
DMARK_APP_API_TOKEN=meil_production_dashboard_proxy_key
DMARK_DASHBOARD_MOCK=0
```

The API token must be stored only in server-side environment variables and must have these scopes:

- `domain:read`
- `domain:write`
- `reporter:read`

Do not prefix the token variable with `NEXT_PUBLIC_`.

## Phase 1: Add Backend Client And Types

Create a dashboard backend client in `lib/dashboard-api.ts`.

Work:

- Define TypeScript types that match backend snake_case JSON.
- Define mapped UI types that preserve current component expectations where practical.
- Add `dashboardBackendURL(path: string): URL`.
- Add `dashboardFetch<T>(path: string, init?: RequestInit): Promise<T>`.
- Read `DMARK_APP_API_BASE_URL` and `DMARK_APP_API_TOKEN` only on the server.
- Return clear errors for missing base URL, missing token, non-JSON errors, and backend error JSON.
- Add an explicit mock gate:

```ts
export function shouldUseDashboardMock(): boolean {
  return process.env.DMARK_DASHBOARD_MOCK === "1";
}
```

Acceptance:

- No backend token can be imported into a client component.
- Backend errors preserve a useful message for UI notices.
- Types include dashboard summary, domains, domain detail, change plan, reporter, alerts, and settings.

## Phase 2: Add Next Proxy Routes

Add server-side route handlers under `app/api/dashboard`.

Endpoints:

```http
GET  /api/dashboard
GET  /api/dashboard/domains
GET  /api/dashboard/domains/[id]
POST /api/dashboard/domains/[id]/recheck
GET  /api/dashboard/domains/[id]/change-plan
GET  /api/dashboard/domains/[id]/reporter
GET  /api/dashboard/alerts
POST /api/dashboard/alerts/[id]/ack
POST /api/dashboard/alerts/[id]/mute
GET  /api/dashboard/settings
POST /api/dashboard/settings
```

Implementation notes:

- Proxy route handlers call `dmark-app` `/api/v1/dashboard/*`.
- Preserve query strings for Reporter:
  - `filter=unknown`
  - `format=csv`
- For CSV export, stream or return the backend CSV response with `text/csv` and `Content-Disposition`.
- JSON proxy responses should use `NextResponse.json`.
- Use `cache: "no-store"` for all dashboard reads.
- Do not silently fall back to mock data unless `DMARK_DASHBOARD_MOCK=1`.

Acceptance:

- Browser code calls only `/api/dashboard/*`.
- `DMARK_APP_API_TOKEN` never appears in client bundles or responses.
- Missing token/base URL returns a controlled `503` JSON error.
- Backend 401/403/404/429/500 errors are passed through as useful JSON.

## Phase 3: Replace Dashboard Fixtures With Fetchers

Refactor `lib/dashboard.ts`.

Work:

- Keep existing exported UI types if possible:
  - `ProtectedDomain`
  - `DashboardMetric`
  - `SenderSource`
  - `DashboardAlert`
  - `Recommendation`
  - `ActivityEvent`
- Replace exported static arrays with:
  - mock fixtures exported under explicit names, for example `mockProtectedDomains`
  - mapper functions from backend responses to current UI types
  - async fetch helpers for proxy routes

Suggested functions:

```ts
export async function getDashboardData(): Promise<DashboardViewModel>;
export async function getReporterData(domainID: string, filter?: "unknown"): Promise<ReporterViewModel>;
export async function getChangePlan(domainID: string): Promise<ChangePlanViewModel>;
export async function getDashboardAlerts(): Promise<DashboardAlert[]>;
export async function getDashboardSettings(): Promise<SettingsState>;
export async function recheckDashboardDomain(domainID: string): Promise<RecheckResult>;
export async function acknowledgeDashboardAlert(alertID: string, reason?: string): Promise<void>;
export async function muteDashboardAlert(alertID: string, duration?: string, reason?: string): Promise<void>;
export async function saveDashboardSettings(settings: SettingsState): Promise<SettingsState>;
```

Important mapping differences:

- Backend uses snake_case. UI uses camelCase.
- Backend `dkim_coverage` is `"covered" | "missing" | "unknown"`. Current UI expects a number. Map:
  - `covered` -> `100`
  - `missing` -> `0`
  - `unknown` -> `0`
- Backend does not return `owner`. Use `"Dmark"` or remove the UI dependency.
- Backend timestamps are RFC3339. Current UI displays relative strings. Add a small relative-time formatter.
- Backend alert severity comes from drift values such as `critical`, `warn`, and `info`. Map to current UI:
  - `critical` -> `critical`
  - `warn` -> `medium`
  - `info` -> `low`
- Backend change plan returns backend-owned changes. Replace hardcoded `recommendations` copy with change-plan rows.

Acceptance:

- `protectedDomains` fixtures are no longer the production data source.
- Mock data is used only when `DMARK_DASHBOARD_MOCK=1`.
- The UI can render empty backend states without crashing.

## Phase 4: Convert Dashboard Page To Server-Fetched Initial Data

Update `app/dashboard/page.tsx` and `components/dmark-dashboard.tsx`.

Recommended approach:

- Make `app/dashboard/page.tsx` fetch initial dashboard data server-side.
- Pass the initial view model into `DmarkDashboard`.
- Keep `DmarkDashboard` as a client component for tabs, filters, recheck buttons, alert actions, settings toggles, and notices.

Work:

- Change `DmarkDashboard` props to accept initial data:

```ts
type DmarkDashboardProps = {
  initialDashboard: DashboardViewModel;
  initialAlerts: DashboardAlert[];
  initialSettings: SettingsState;
};
```

- Remove direct imports of fixture arrays from the component.
- Keep local state initialized from props.
- On successful mutating actions, update local state or refetch the relevant proxy route.

Acceptance:

- First dashboard render uses backend data.
- No client component imports server-only token helpers.
- Loading/error states are visible and non-disruptive.

## Phase 5: Wire User Actions

Update current mock action handlers in `components/dmark-dashboard.tsx`.

Actions:

- Recheck:
  - Current mock function: `recheckDomain(domain)`
  - New behavior: `POST /api/dashboard/domains/{id}/recheck`
  - Show queued/completed status from the response.

- Alert acknowledge:
  - Current mock function: `resolveAlert(alertID, "acknowledged")`
  - New behavior: `POST /api/dashboard/alerts/{id}/ack`
  - Remove alert from active list on success.

- Alert mute:
  - Current mock function: `resolveAlert(alertID, "muted")`
  - New behavior: `POST /api/dashboard/alerts/{id}/mute`
  - Send `{ "duration": "7d" }` unless the UI exposes another duration.
  - Remove alert from active list on success.

- Settings:
  - Persist toggles to `POST /api/dashboard/settings`.
  - Map current UI settings:
    - `alignmentGate` -> `require_alignment_before_reject: 95`
    - `pauseOnUnknownSpike` -> `pause_automation_on_unknown_senders_spike`
    - `monthlyReports` -> `auto_generate_monthly_executive_reports`
    - notification UI -> `notification_channels`

- Reporter:
  - Fetch selected domain Reporter data from `/api/dashboard/domains/{id}/reporter`.
  - Unknown filter calls `?filter=unknown`.
  - Export calls `?format=csv` and downloads the returned CSV.

- Change plan:
  - Fetch `/api/dashboard/domains/{id}/change-plan` when the selected domain changes or when the relevant tab opens.
  - Replace hardcoded recommendations with backend change-plan entries.

Acceptance:

- Every existing dashboard interaction either mutates backend state or fetches backend-owned data.
- Failed actions display backend error messages.
- Recheck, acknowledge, mute, export, filter, and settings toggles still work from the user’s point of view.

## Phase 6: Empty And Error States

Add explicit states for:

- No protected domains.
- Domain not found.
- Reporter not configured.
- No active alerts.
- Settings unavailable.
- Backend unauthenticated or under-scoped token.
- Recheck rate-limited or coalesced.

Acceptance:

- No screen crashes on empty arrays.
- 401/403 show an operator configuration error, not a generic blank dashboard.
- Reporter empty state uses backend `setup_guidance` when present.

## Phase 7: Local Demo Workflow

Use the backend seed script for local test data.

Backend:

```sh
cd /Users/andri/Documents/GitHub/dmark-app
go run ./cmd/meil migrate up
go run ./scripts/dev/seed.go
go run ./cmd/meil serve
```

Copy the printed `api_token` and `domain_id`.

Frontend:

```sh
cd /Users/andri/Documents/GitHub/dmark-web
DMARK_APP_API_BASE_URL=http://localhost:8080 \
DMARK_APP_API_TOKEN=meil_from_seed_output \
DMARK_DASHBOARD_MOCK=0 \
npm run dev
```

Open:

```txt
http://localhost:3000/dashboard
```

Acceptance:

- Dashboard shows the seeded `example.com` protected domain.
- Reporter tab shows both expected and unknown senders.
- Alerts tab shows the seeded DMARC alert.
- Settings tab loads persisted settings.
- Recheck returns a queued response.

## Phase 8: Verification

Run:

```sh
npm run lint
npm run build
```

Manual smoke:

- Dashboard initial load.
- Protected domains table.
- Domain recheck.
- Change plan rendering.
- Reporter tab.
- Unknown sender filter.
- CSV export.
- Alert acknowledge.
- Alert mute.
- Settings toggle save.
- Mock mode with `DMARK_DASHBOARD_MOCK=1`.
- Production-like mode with `DMARK_DASHBOARD_MOCK=0` and missing token should fail clearly.

Security checks:

- Search built output and source for the real token value.
- Confirm only server route handlers read `DMARK_APP_API_TOKEN`.
- Confirm browser network calls go to `/api/dashboard/*`, not directly to `dmark-app`.

## Suggested Codex Prompt

```text
Continue Dmark frontend work in /Users/andri/Documents/GitHub/dmark-web using docs/CODEX_FRONTEND_DASHBOARD_PLAN.md. Replace the mock dashboard data with server-side proxy routes to the dmark-app authenticated dashboard API. Do not expose the backend API token to browser JavaScript. Preserve the existing dashboard interaction model: recheck, copy/export, Reporter filter, alert acknowledge/mute, and settings toggles. Update tests/docs as needed and run npm run lint and npm run build before stopping.
```
