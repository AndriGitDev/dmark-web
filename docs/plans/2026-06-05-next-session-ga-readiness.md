# Dmark GA Readiness Next Session Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task if the next session becomes a multi-area execution run. Use test-driven-development for every code change.

**Goal:** Bring Dmark from customer-dashboard Authentik wiring to GA-ready product quality without weakening admin/customer isolation or the unauthenticated public scanner.

**Architecture:** The app now has two independent Authentik/OIDC concepts: admin (`dmark-web-admin`, `DMARK_AUTHENTIK_*`, `/api/auth/*`, `dmark_authentik_session`) and customer dashboard (`dmark-dashboard`, `DMARK_DASHBOARD_AUTHENTIK_*`, `/api/dashboard/auth/*`, `dmark_dashboard_authentik_session`). GA work should preserve that boundary while hardening UX, observability, operational docs, and smoke tests.

**Tech Stack:** Next.js app, Node test suite (`npm test`), lint/build scripts (`npm run lint`, `npm run build`), Authentik OIDC, Coolify deployment, Bunny/proxy headers.

---

## Fresh Session Boot Checklist

1. Recall Memento first:
   - `dmark GA dashboard Authentik customer login readiness`
   - `Shipped customer-facing Authentik OIDC login for dmark-web dashboard on main`
   - `dmark-web Authentik callback localhost redirect Coolify Bunny`
2. Go to repo:
   - `cd /root/workspace/github/AndriGitDev/dmark-web`
3. Verify clean starting state:
   - `git status --short --branch`
   - `git log -5 --oneline`
4. Read the auth implementation before editing:
   - `lib/dashboard-authentik-access.ts`
   - `app/api/dashboard/auth/login/route.ts`
   - `app/api/dashboard/auth/callback/route.ts`
   - `app/api/dashboard/auth/logout/route.ts`
   - `app/api/dashboard/[[...path]]/route.ts`
   - `app/dashboard/page.tsx`
   - `lib/admin-access.ts`
   - `README.md`
5. Re-run baseline verification before changes:
   - `npm test`
   - `npm run lint`
   - `npm run build`
6. If live Authentik behavior matters, start from `https://dmark.is/dashboard`, not Authentik library. Incognito already confirmed the customer login path works; a normal browser landing at `https://auth.kastro.is/if/user/#/library` was likely stale browser/Auth/site data.

---

## Current Authentik Status / Facts

- Admin Authentik is live and working.
- Admin provider/app was renamed to `dmark-web-admin`.
- Customer provider/app concept is separate: `dmark-dashboard`.
- Desired and implemented customer callback: `https://dmark.is/api/dashboard/auth/callback`.
- Dashboard login redirect was observed to generate the correct Authentik authorize request with:
  - `client_id=dmark-dashboard`
  - `redirect_uri=https://dmark.is/api/dashboard/auth/callback`
- Incognito browser test worked, strongly indicating app/provider wiring is correct.
- Normal browser issue was probably stale cookies/site data or Authentik session state. Suggested remediation:
  - log out at `https://auth.kastro.is/if/session-end/`
  - clear cookies/site data for `dmark.is` and `auth.kastro.is`
  - start again from `https://dmark.is/dashboard`

---

## Scope Boundary for Next Session

### In scope

- GA readiness for customer-facing dashboard auth and product surface.
- Tests for auth/session/route boundary regressions.
- UX polish for dashboard login/logout/error states.
- README/operator docs for customer onboarding and Authentik provider setup.
- Lightweight smoke scripts/checklists for production verification.
- Security review focused on cookies, redirects, origin handling, provider separation, and public scanner unauthenticated access.

### Out of scope unless Andri explicitly asks

- Reusing or merging admin and customer Authentik providers.
- Changing the public scanner to require authentication.
- Touching non-DMARK Coolify projects.
- Echoing, storing, or logging live Authentik/Coolify secrets.
- Large dashboard feature work unrelated to GA gating.

---

## Task 1: Re-establish Baseline and Live Auth Truth

**Objective:** Confirm the repository and deployed app are in the expected post-auth state before changing anything.

**Files:**
- Read: `README.md`
- Read: `test/dashboard-model.test.mjs`
- Read: `lib/dashboard-authentik-access.ts`
- Read: `app/api/dashboard/[[...path]]/route.ts`

**Step 1: Verify local baseline**

Run:

```bash
git status --short --branch
npm test
npm run lint
npm run build
```

Expected:
- Branch tracks `origin/main`.
- Tests pass. Last known count: 55/55.
- Lint passes.
- Build passes.

**Step 2: Verify production redirect shape without secrets**

Run a header-only smoke against login:

```bash
python3 - <<'PY'
import urllib.request
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None
opener = urllib.request.build_opener(NoRedirect)
try:
    opener.open('https://dmark.is/api/dashboard/auth/login', timeout=20)
except urllib.error.HTTPError as e:
    print(e.code)
    print(e.headers.get('location'))
    print(e.headers.get('set-cookie'))
PY
```

Expected:
- HTTP 303 or equivalent redirect.
- `location` points to Authentik authorize endpoint.
- Query contains `client_id=dmark-dashboard` and `redirect_uri=https://dmark.is/api/dashboard/auth/callback`.
- State cookie is set for the dashboard callback path.

**Step 3: Document any drift**

If current behavior differs, stop and debug root cause using systematic-debugging before adding GA polish.

---

## Task 2: Add a Production Smoke Script for Auth Boundaries

**Objective:** Make GA verification repeatable without browser-only checks.

**Files:**
- Create: `scripts/smoke-dashboard-auth.mjs` or `scripts/smoke-dashboard-auth.py`
- Modify: `package.json` if adding an npm script is useful
- Test: `test/dashboard-model.test.mjs` only if helper logic is extracted

**Step 1: Write the smoke expectations first**

The script should verify:
- `/dashboard` returns a page containing dashboard login UI when unauthenticated.
- `/api/dashboard` returns 401 unauthenticated when dashboard Authentik is enabled.
- `/api/dashboard/auth/login` redirects to Authentik with customer provider/client id and callback.
- `/api/scan` remains unauthenticated/public for scanner POST behavior, using a safe minimal payload or existing smoke pattern.
- Admin `/api/auth/login` remains separate and uses admin callback/client settings when configured.

**Step 2: Implement with no secrets**

Use only public endpoints and header inspection. Do not print cookies except names/path/flags if necessary; redact values.

**Step 3: Verify**

Run:

```bash
node scripts/smoke-dashboard-auth.mjs https://dmark.is
# or
python3 scripts/smoke-dashboard-auth.py https://dmark.is
```

Expected: clear PASS/FAIL lines with no secret values.

**Step 4: Commit**

```bash
git add scripts/smoke-dashboard-auth.* package.json test/dashboard-model.test.mjs
git commit -m "test: add dashboard auth smoke checks"
```

---

## Task 3: Polish Dashboard Auth UX and Error Recovery

**Objective:** Make customer sign-in failure states understandable enough for GA.

**Files:**
- Modify: `app/dashboard/page.tsx`
- Possibly modify: `app/api/dashboard/auth/callback/route.ts`
- Test: `test/dashboard-model.test.mjs`

**Step 1: Add failing tests for visible states**

Cover:
- Missing session shows customer dashboard login, not admin login.
- `?login=authentik-failed` or equivalent displays a customer-safe error.
- Logout path returns user to `/dashboard` or a clear signed-out state.
- No admin env/cookie names appear in customer UI text or customer routes.

**Step 2: Implement minimal UI copy**

Keep it precise and non-corporate:
- “Sign in to Dmark dashboard”
- “Your sign-in session expired. Please try again.”
- “If this keeps happening, clear site data for dmark.is and auth.kastro.is, then start from /dashboard.”

**Step 3: Verify**

Run:

```bash
npm test
npm run lint
npm run build
```

**Step 4: Commit**

```bash
git add app/dashboard/page.tsx app/api/dashboard/auth/callback/route.ts test/dashboard-model.test.mjs
git commit -m "feat: improve dashboard auth recovery UX"
```

---

## Task 4: Security Boundary Regression Tests

**Objective:** Prevent accidental coupling between admin and customer auth during future GA work.

**Files:**
- Modify: `test/dashboard-model.test.mjs`
- Possibly extract helpers if test file is getting too broad

**Step 1: Add RED tests**

Add tests asserting:
- Admin session cookie does not authorize dashboard API.
- Dashboard session cookie does not authorize admin checks.
- Dashboard Authentik env uses only `DMARK_DASHBOARD_AUTHENTIK_*`.
- Admin Authentik env uses only `DMARK_AUTHENTIK_*`.
- Public scanner route/model does not depend on dashboard session.
- Dashboard callback rejects bad/missing `state`.
- Dashboard callback rejects non-allowed redirect/origin behavior.

**Step 2: Implement/fix only if tests reveal a gap**

Do not refactor auth code for aesthetics. Keep YAGNI.

**Step 3: Verify**

Run:

```bash
npm test
npm run lint
npm run build
```

**Step 4: Commit**

```bash
git add test/dashboard-model.test.mjs lib/*.ts app/api/**/*.ts
git commit -m "test: lock admin and dashboard auth isolation"
```

---

## Task 5: Operator Documentation for Customer Authentik Setup

**Objective:** Make customer Authentik setup reproducible and supportable for GA.

**Files:**
- Modify: `README.md`
- Possibly create: `docs/AUTHENTIK_DASHBOARD_SETUP.md`

**Step 1: Document exact Authentik objects**

Include:
- Application name: `dmark-dashboard`
- Provider name/client id: `dmark-dashboard`
- Redirect URI: `https://dmark.is/api/dashboard/auth/callback`
- Launch URL: `https://dmark.is/dashboard`
- Recommended consent mode for first-party dashboard: implicit consent
- Group/claim expectations if configured
- Do not reuse `dmark-web-admin`

**Step 2: Document environment variables**

Include customer variables separately from admin variables:
- `DMARK_DASHBOARD_AUTHENTIK_ISSUER`
- `DMARK_DASHBOARD_AUTHENTIK_CLIENT_ID`
- `DMARK_DASHBOARD_AUTHENTIK_CLIENT_SECRET`
- `DMARK_DASHBOARD_AUTHENTIK_ALLOWED_EMAILS` / groups if implemented
- `DMARK_DASHBOARD_AUTHENTIK_SESSION_SECRET`

Keep values as placeholders only.

**Step 3: Add browser cache troubleshooting**

Include:
- Incognito works = likely stale cookies/session state.
- Clear site data for `dmark.is` and `auth.kastro.is`.
- Start from `https://dmark.is/dashboard`, not Authentik library.

**Step 4: Verify docs references**

Run:

```bash
npm test
npm run lint
npm run build
```

**Step 5: Commit**

```bash
git add README.md docs/AUTHENTIK_DASHBOARD_SETUP.md
git commit -m "docs: add dashboard Authentik GA setup guide"
```

---

## Task 6: GA Gate Checklist

**Objective:** Decide whether Dmark is ready to call GA, and capture remaining blockers.

**Files:**
- Create or modify: `docs/GA_CHECKLIST.md`

**Checklist:**

- Auth/security:
  - Admin and customer Authentik providers are separate.
  - Admin `/admin` remains owner/admin-gated.
  - Dashboard `/dashboard` requires customer login when enabled.
  - `/api/dashboard/*` requires customer session when enabled.
  - `/api/scan` remains public unauthenticated.
  - Secure cookies are `HttpOnly`, `Secure` in production, `SameSite=Lax`, scoped narrowly.
  - Callback state validation is tested.
  - Redirect origin behavior is tested behind Coolify/Bunny.
- Product UX:
  - Dashboard sign-in, sign-out, expired session, and auth failure states are understandable.
  - Customer starts from `https://dmark.is/dashboard`.
  - Authentik app launch URL points back to `https://dmark.is/dashboard`.
- Operations:
  - README/setup docs are current.
  - Smoke script exists and passes against production.
  - Coolify env variables are present and separated; no secrets in git/logs.
  - Deployment is verified after push.
- Quality gates:
  - `npm test` passes.
  - `npm run lint` passes.
  - `npm run build` passes.
  - `git diff --check` passes.
  - GitHub Actions, if present, pass.

**Commit:**

```bash
git add docs/GA_CHECKLIST.md
git commit -m "docs: add Dmark GA checklist"
```

---

## Final Verification and Push

After completing the chosen GA slice:

```bash
npm test
npm run lint
npm run build
git diff --check
git status --short
git push origin main
```

If GitHub Actions exist:

```bash
gh run list --limit 5
gh run watch <run-id>
```

After push, write a Memento note with:
- final commit hash
- files changed
- verification commands/results
- production smoke result
- remaining GA blockers

---

## Acceptance Criteria for the Next Session

The next session is successful if it produces one of these outcomes:

1. **GA-ready:** Smoke script, docs, UX recovery, security regression tests, and GA checklist are done, verified, pushed, and documented in Memento.
2. **GA-blocked with evidence:** A specific live/provider/deployment issue is reproduced, root-caused, documented, and either fixed or turned into a precise blocker with next action.
3. **Scoped GA slice complete:** At least one high-value GA slice is completed via TDD, fully verified, pushed, and captured in Memento.
