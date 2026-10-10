# Codex Frontend Milestone Handoff

> Historical scope, superseded 2026-10-10 by the [free Kastro product plan](FREE_PRODUCT_PLAN.md). Paid tiers, hosted SPF flattening and earlier GA promises below are not current product commitments. Runtime retirement must follow the dependency migration plan; historical implementation evidence remains useful.

## Completion Note - 2026-05-29

This milestone handoff is archived. The dashboard integration, backend proxying, live backend QA, and local visual QA are complete for the current product state. The remaining longer-term ideas below are future milestones, not blockers for the completed handoff.

## Current Baseline

- Branch: `main`.
- Primary dashboard files:
  - `app/dashboard/page.tsx`
  - `components/dmark-dashboard.tsx`
  - `lib/dashboard.ts`
  - `lib/dashboard-api.ts`
  - `app/api/dashboard/[[...path]]/route.ts`
  - `test/dashboard-model.test.mjs`
- Existing milestone docs:
  - `docs/CODEX_FRONTEND_DASHBOARD_PLAN.md`
  - `docs/CODEX_BACKEND_ROADMAP.md`
  - `docs/CODEX_SPF_FLATTENER_PLAN.md`
- Last verified checks:

```sh
npm run lint
npm test
npm run build
git diff --check
```

## Non-Negotiables

- Browser code must call frontend-owned `/api/dashboard/*` routes, not `dmark-app` directly.
- `DMARK_API_TOKEN` and `DMARK_APP_API_TOKEN` must remain server-only. Never use a `NEXT_PUBLIC_` token.
- Mock data may only be used when `DMARK_DASHBOARD_MOCK=1`.
- Keep product copy operator-facing. Avoid implementation terms such as backend, proxy, contract, seeded, fixture, or mock in visible UI.
- Long DNS records, evidence text, and lookalike domains must wrap or scroll inside stable containers on mobile.
- Do not introduce a browser test stack unless the repo preference is confirmed or the change clearly needs it.

## Future Milestone Ideas

The following product ideas remain on the backlog for later work. They are not blockers for the completed handoff above:

- Reliable visual and keyboard behavior across desktop, tablet, and mobile.
- A protected-domain detail route for focused domain work.
- Add-domain and ownership-verification UI scaffolding.
- SPF flattener configuration UI that matches the Bunny DNS plan.
- Stronger Reporter, Brand Risk, alerts, and settings workflows.
- Browser-level regression coverage once a browser runner is available.

## Phase 1: Visual QA And Accessibility

Visual/browser QA for the dashboard has been completed in local mock mode.

Viewports:

- Desktop: `1440x900`.
- Tablet: `1024x768`.
- Mobile: `390x844`.

Screens:

- Overview.
- Domains.
- Reporter with populated inventory and empty guidance.
- Brand Risk with active-only and inactive-included candidates.
- Alerts.
- Settings.
- Long Change Plan records and evidence text.

Work:

- Check keyboard navigation across sidebar tabs, domain rows, action buttons, copy buttons, Reporter filter/export controls, alert actions, and settings controls.
- Verify visible focus states.
- Confirm table and card overflow behavior on mobile.
- Fix any text overlap, clipped buttons, unstable row heights, or unreadable long DNS strings.
- Capture screenshots or notes in this doc if a visual issue is intentionally deferred.

Acceptance:

- No incoherent overlap at the listed viewports.
- Every interactive control is keyboard-reachable.
- Focus indication is visible.
- Long text is readable without breaking the layout.

## Phase 2: Protected Domain Detail Route

Add `/dashboard/domains/[id]` as a focused protected-domain workspace.

Recommended shape:

- Keep `/dashboard` as the fleet overview.
- Add `app/dashboard/domains/[id]/page.tsx` for detail.
- Reuse existing dashboard fetchers and mappers.
- Keep mutating actions routed through `/api/dashboard/*`.
- Link domain rows/cards from the fleet view to the detail route.

Detail route sections:

- Domain posture summary.
- Enforcement ladder.
- Change Plan.
- Reporter sender inventory.
- Brand Risk findings/lookalikes.
- Active alerts for that domain.
- Recent activity or history when backend data is available.

Acceptance:

- Direct navigation to `/dashboard/domains/{id}` works.
- Unknown domain ID shows a clear not-found/empty state.
- No backend token logic is duplicated in client components.
- The fleet overview still works as a fast operational dashboard.

## Phase 3: Add Domain And Ownership Verification UI

Add the browser scaffolding for protected-domain onboarding, even if final backend ownership APIs are still evolving.

Work:

- Add an `Add domain` flow from the dashboard header.
- Collect domain name and show validation errors inline.
- Show verification instructions when the backend can provide them.
- If the backend endpoint is not ready, use a server-only route stub that returns a clear `501`/unavailable state in non-mock mode and a mock flow in `DMARK_DASHBOARD_MOCK=1`.
- Keep the flow compact and operational, not marketing-style.

Preferred UX:

- Modal or side panel for adding a domain.
- Verification status panel with DNS TXT/CNAME record, copy button, and retry check action.
- Clear pending, verified, failed, and expired states.

Acceptance:

- Users can start the add-domain flow without leaving the dashboard.
- Unsupported backend state fails clearly.
- No fake successful verification in production-like mode.

## Phase 4: SPF Flattener Frontend

Build the frontend surface for the Bunny.net-backed SPF flattener plan in `docs/CODEX_SPF_FLATTENER_PLAN.md`.

UI concepts:

- Per-domain "SPF route" panel.
- Current mode: advisory / configured / publishing / healthy / stale / failed / disabled.
- Provider/include selection list.
- Generated `_spf.<domain>` CNAME instruction.
- Published `<client>.route.dmark.is` TXT preview when backend data exists.
- Last sync, next sync, and failure reason.

Implementation constraints:

- Bunny API credentials are never read by the frontend.
- The UI should be driven by backend status once endpoints exist.
- Until endpoints exist, add types and mock-only fixtures behind `DMARK_DASHBOARD_MOCK=1`; production-like mode should show "not configured yet" rather than fabricated success.

Acceptance:

- Operators can understand what DNS record the customer needs to publish.
- Failed/stale flattener states are prominent.
- Generated SPF/TXT values use copy controls and safe wrapping.

## Phase 5: Reporter And Brand Risk Workflow Polish

Improve the current tabs from "data visible" to "operator workflow".

Reporter:

- Add clearer empty state using backend `setup_guidance`.
- Add provider/source drilldown affordance if backend detail exists.
- Preserve CSV export.
- Add classification actions only after backend support exists.
- Make unknown sender risk visually distinct without making expected senders noisy.

Brand Risk:

- Add severity filters.
- Add active-evidence filter separate from inactive candidate inclusion.
- Make inactive candidates visibly informational.
- Preserve DNS evidence badges for A/AAAA and MX.
- Avoid implying inactive candidates are confirmed abuse.

Acceptance:

- Operator can answer "what do I need to do next?" from each tab.
- Inactive Brand Risk rows cannot be mistaken for confirmed threats.
- Empty states guide setup rather than reading as a broken dashboard.

## Phase 6: Alerts And Settings Hardening

Alerts:

- Add optimistic but reversible UI state for acknowledge and mute.
- Show backend error messages inline if actions fail.
- Consider a simple reason input if backend audit value becomes useful.
- Keep muted/acknowledged alerts out of active view after successful action.

Settings:

- Keep threshold validation local and backend-backed.
- Show saved timestamp when available.
- Distinguish "settings unavailable" from "settings saved".
- Make notification channel checkboxes easy to scan on mobile.

Acceptance:

- Alert actions remain understandable under latency or failure.
- Settings form cannot submit out-of-range threshold values.
- Backend `400` errors remain visible to the operator.

## Phase 7: Browser Regression Tests

Add browser interaction tests after the browser-runner decision is made.

Suggested coverage:

- Dashboard overview renders seeded or mocked summary metrics.
- Domain row opens `/dashboard/domains/[id]`.
- Recheck action shows queued response.
- Reporter unknown filter and CSV export work.
- Brand Risk active/inactive toggles preserve inactive semantics.
- Alert acknowledge/mute update active list.
- Settings validation and backend `400` errors render.

Acceptance:

- Test stack runs in CI/local without leaking backend tokens.
- Tests can run against mock mode by default.
- Live-backend smoke remains a separate manual or environment-gated check.

## Verification Reference

Before handing off or pushing, run:

```sh
npm run lint
npm test
npm run build
git diff --check
```

When live backend QA is relevant:

```sh
cd /Users/andri/Documents/GitHub/dmark-app
go run ./cmd/meil migrate up
go run ./scripts/dev/seed.go
go run ./cmd/meil serve
```

Then in `dmark-web`:

```sh
DMARK_API_BASE_URL=http://127.0.0.1:8080 \
DMARK_API_TOKEN=meil_from_seed_output \
DMARK_DASHBOARD_MOCK=0 \
npm run dev
```

Never commit or store the real seed token.

## Archived Next Prompt

```text
Continue Dmark frontend milestone work in /Users/andri/Documents/GitHub/dmark-web using docs/CODEX_FRONTEND_MILESTONE_HANDOFF.md. Start with Phase 1 visual/accessibility QA if the in-app browser is available; otherwise implement Phase 2 protected-domain detail route. Preserve server-only dashboard token handling and run npm run lint, npm test, npm run build, and git diff --check before stopping.
```

