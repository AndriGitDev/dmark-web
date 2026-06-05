import assert from "node:assert/strict";
import { createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function loadTSModule(relativePath) {
  const filename = join(root, relativePath);
  const source = readFileSync(filename, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  });
  const cjsModule = { exports: {} };
  const sandbox = {
    AbortController,
    Buffer,
    DOMException,
    Error,
    Headers,
    Intl,
    Response,
    URL,
    clearTimeout,
    console,
    exports: cjsModule.exports,
    fetch,
    module: cjsModule,
    process,
    require: (specifier) => {
      if (specifier === "server-only") return {};
      if (specifier === "node:crypto") return { createHmac, timingSafeEqual };
      if (specifier === "./authentik-access") return loadTSModule("lib/authentik-access.ts");
      throw new Error(`Unexpected require: ${specifier}`);
    },
    setTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename });
  return cjsModule.exports;
}

test("privacy analytics config is explicit, allowlisted, and secret-free", () => {
  const previousProvider = process.env.DMARK_ANALYTICS_PROVIDER;
  const previousDomain = process.env.DMARK_ANALYTICS_DOMAIN;
  const previousScriptURL = process.env.DMARK_ANALYTICS_SCRIPT_URL;
  const previousSiteID = process.env.DMARK_ANALYTICS_SITE_ID;
  const previousApiKey = process.env.DMARK_ANALYTICS_API_KEY;

  try {
    const analytics = loadTSModule("lib/analytics.ts");

    delete process.env.DMARK_ANALYTICS_PROVIDER;
    delete process.env.DMARK_ANALYTICS_DOMAIN;
    delete process.env.DMARK_ANALYTICS_SCRIPT_URL;
    delete process.env.DMARK_ANALYTICS_SITE_ID;
    delete process.env.DMARK_ANALYTICS_API_KEY;
    assert.equal(analytics.getAnalyticsConfig(), null);

    process.env.DMARK_ANALYTICS_PROVIDER = "google-analytics";
    process.env.DMARK_ANALYTICS_DOMAIN = "dmark.is";
    process.env.DMARK_ANALYTICS_SCRIPT_URL = "https://www.google-analytics.com/gtag/js?id=G-SECRET";
    assert.equal(analytics.getAnalyticsConfig(), null);

    process.env.DMARK_ANALYTICS_PROVIDER = "plausible";
    process.env.DMARK_ANALYTICS_DOMAIN = "dmark.is";
    process.env.DMARK_ANALYTICS_SCRIPT_URL = "https://www.google-analytics.com/gtag/js?id=G-SECRET";
    assert.equal(analytics.getAnalyticsConfig(), null);

    process.env.DMARK_ANALYTICS_SCRIPT_URL = "https://plausible.io/js/script.js";
    process.env.DMARK_ANALYTICS_SITE_ID = "site-123";
    process.env.DMARK_ANALYTICS_API_KEY = ["fixture", "analytics", "key"].join("-");

    const config = analytics.getAnalyticsConfig();
    assert.equal(config.provider, "plausible");
    assert.equal(config.domain, "dmark.is");
    assert.equal(config.scriptURL, "https://plausible.io/js/script.js");
    assert.equal(config.siteID, null);
    assert.equal(JSON.stringify(config).includes("fixture-analytics-key"), false);
  } finally {
    restoreEnv("DMARK_ANALYTICS_PROVIDER", previousProvider);
    restoreEnv("DMARK_ANALYTICS_DOMAIN", previousDomain);
    restoreEnv("DMARK_ANALYTICS_SCRIPT_URL", previousScriptURL);
    restoreEnv("DMARK_ANALYTICS_SITE_ID", previousSiteID);
    restoreEnv("DMARK_ANALYTICS_API_KEY", previousApiKey);
  }
});

test("root layout wires only the privacy analytics component", () => {
  const source = readFileSync(join(root, "app/layout.tsx"), "utf8");

  assert.match(source, /PrivacyAnalytics/);
  assert.doesNotMatch(source, /google-analytics|gtag|GTM|facebook|hotjar/i);
});

test("privacy event tracking is no-op safe and dispatches only coarse scanner properties", () => {
  const events = loadTSModule("lib/privacy-events.ts");
  const plausibleCalls = [];
  const umamiCalls = [];
  const posthogCalls = [];
  const target = {
    plausible: (...args) => plausibleCalls.push(args),
    umami: { track: (...args) => umamiCalls.push(args) },
    posthog: { capture: (...args) => posthogCalls.push(args) },
  };

  assert.doesNotThrow(() => events.trackPrivacyEvent("scan_start", { status: "PASS" }, {}));

  events.trackPrivacyEvent(
    "scan_complete",
    {
      status: "WARNING",
      source: "public_scanner",
      domain: "customer.is",
      email: "person@example.is",
      error: "resolver returned token=fixture-secret",
      url: "https://dmark.is/?domain=customer.is",
    },
    target,
  );

  assert.deepEqual(JSON.parse(JSON.stringify(plausibleCalls)), [["scan_complete", { props: { status: "WARNING", source: "public_scanner" } }]]);
  assert.deepEqual(JSON.parse(JSON.stringify(umamiCalls)), [["scan_complete", { status: "WARNING", source: "public_scanner" }]]);
  assert.deepEqual(JSON.parse(JSON.stringify(posthogCalls)), [["scan_complete", { status: "WARNING", source: "public_scanner" }]]);
});

test("privacy events reject unknown event names, unsafe properties, and unsafe sources", () => {
  const events = loadTSModule("lib/privacy-events.ts");
  const calls = [];
  const target = { plausible: (...args) => calls.push(args) };

  events.trackPrivacyEvent("signup", { status: "PASS" }, target);
  events.trackPrivacyEvent("scan_error", { status: "../../FAIL", source: "public_scanner", step: "backend" }, target);
  events.trackPrivacyEvent("cta_click", { source: "https://tracker.invalid/?domain=customer.is" }, target);
  events.trackPrivacyEvent("scan_validation_error", { status: "ERROR", source: "public_scanner" }, target);

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["scan_validation_error", { props: { status: "ERROR", source: "public_scanner" } }]]);
});

test("privacy events allow claim, CTA, recommendation, and dashboard lifecycle events with coarse properties only", () => {
  const events = loadTSModule("lib/privacy-events.ts");
  const calls = [];
  const target = { plausible: (...args) => calls.push(args) };

  events.trackPrivacyEvent("cta_click", { source: "pricing", plan: "managed", domain: "customer.is" }, target);
  events.trackPrivacyEvent("recommendation_view", { status: "WARNING", source: "public_scanner", record: "v=spf1 include:vendor.example" }, target);
  events.trackPrivacyEvent("claim_start", { source: "upgrade_modal", email: "person@example.is" }, target);
  events.trackPrivacyEvent("claim_complete", { status: "PASS", source: "upgrade_modal", name: "Customer" }, target);
  events.trackPrivacyEvent("dashboard_interaction", { status: "PASS", source: "dashboard_add_domain", domain: "customer.is" }, target);
  events.trackPrivacyEvent("dashboard_interaction", { status: "PASS", source: "dashboard_spf_route", domain: "customer.is", action: "sync" }, target);

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["cta_click", { props: { source: "pricing" } }],
    ["recommendation_view", { props: { status: "WARNING", source: "public_scanner" } }],
    ["claim_start", { props: { source: "upgrade_modal" } }],
    ["claim_complete", { props: { status: "PASS", source: "upgrade_modal" } }],
    ["dashboard_interaction", { props: { status: "PASS", source: "dashboard_add_domain" } }],
    ["dashboard_interaction", { props: { status: "PASS", source: "dashboard_spf_route" } }],
  ]);
});

test("privacy events allow beta-lock CTA sources and discard raw beta request details", () => {
  const events = loadTSModule("lib/privacy-events.ts");
  const calls = [];
  const target = { plausible: (...args) => calls.push(args) };

  events.trackPrivacyEvent("cta_click", { source: "dashboard_beta_lock_scan", domain: "customer.is", url: "/?domain=customer.is" }, target);
  events.trackPrivacyEvent("cta_click", { source: "dashboard_beta_lock_access", email: "person@example.is", plan: "managed" }, target);

  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
    ["cta_click", { props: { source: "dashboard_beta_lock_scan" } }],
    ["cta_click", { props: { source: "dashboard_beta_lock_access" } }],
  ]);
});

test("locked dashboard page wires privacy-safe beta-lock CTA analytics", () => {
  const pageSource = readFileSync(join(root, "app/dashboard/page.tsx"), "utf8");
  const ctaSource = readFileSync(join(root, "components/dashboard-locked-analytics.tsx"), "utf8");

  assert.match(pageSource, /DashboardLockedCTALink/);
  assert.match(ctaSource, /trackPrivacyEvent\("cta_click", \{ source \}\)/);
  for (const coarseSource of ["dashboard_beta_lock_scan", "dashboard_beta_lock_access"]) {
    assert.match(pageSource + ctaSource, new RegExp(coarseSource));
  }
  const eventCalls = ctaSource.match(/trackPrivacyEvent\([^\n]+\);/g) || [];
  assert.equal(eventCalls.length, 1);
  for (const call of eventCalls) {
    assert.doesNotMatch(call, /domain|email|url|record|plan|name|form\.|response/);
  }
});

test("public marketing wires privacy funnel events without passing raw identifiers", () => {
  const source = readFileSync(join(root, "components/dmark-marketing.tsx"), "utf8");

  assert.match(source, /trackPrivacyEvent/);
  for (const eventName of [
    "scan_start",
    "scan_complete",
    "scan_validation_error",
    "scan_error",
    "recommendation_view",
    "cta_click",
    "claim_start",
    "claim_complete",
    "claim_error",
  ]) {
    assert.match(source, new RegExp(eventName));
  }
  const eventCalls = source.match(/trackPrivacyEvent\([^\n]+\);/g) || [];
  assert.ok(eventCalls.length >= 9);
  for (const call of eventCalls) {
    assert.doesNotMatch(call, /domain|email|name|record|response\.json|form\./);
  }
});

test("dashboard wires privacy interactions without passing raw identifiers", () => {
  const source = readFileSync(join(root, "components/dmark-dashboard.tsx"), "utf8");

  assert.match(source, /trackPrivacyEvent/);
  const eventCalls = source.match(/trackPrivacyEvent\([^\n]+\);/g) || [];
  assert.ok(eventCalls.length >= 6);
  for (const call of eventCalls) {
    assert.match(call, /dashboard_interaction/);
    assert.doesNotMatch(call, /domain:|owner:|alertID|selectedDomain|query:|settings:|sourceDrafts/);
  }
  for (const coarseSource of ["dashboard_nav", "dashboard_domain_recheck", "dashboard_spf_route", "dashboard_alerts", "dashboard_settings", "dashboard_export"]) {
    assert.match(source, new RegExp(coarseSource));
  }
});

function baseScanPayload(overrides = {}) {
  return {
    domain: "example.is",
    status: "PASS",
    checkedAt: "2026-06-01T12:00:00Z",
    durationMs: 120,
    source: "live",
    spf: {
      valid: true,
      lookups: 5,
      record: "v=spf1 include:_spf.google.com -all",
    },
    dmarc: {
      valid: true,
      policy: "reject",
      record: "v=DMARC1; p=reject; rua=mailto:dmarc@example.is",
    },
    spoofable: false,
    ...overrides,
  };
}

test("public scan SPF finding separates invalid records from lookup pressure", () => {
  const scan = loadTSModule("lib/scan.ts");

  const invalid = scan.buildSpfFinding(
    baseScanPayload({
      status: "FAIL",
      spf: {
        valid: false,
        lookups: 4,
        record: "v=spf1 include:_spf.google.com ~all typo",
      },
    }),
  );
  assert.equal(invalid.tone, "fail");
  assert.equal(invalid.headline, "FAIL - SPF record did not validate.");
  assert.match(invalid.detail, /reports 4 DNS lookups/);

  const pressure = scan.buildSpfFinding(
    baseScanPayload({
      status: "WARNING",
      spf: {
        valid: true,
        lookups: 9,
        record: "v=spf1 include:_spf.google.com include:spf.protection.outlook.com ~all",
      },
    }),
  );
  assert.equal(pressure.tone, "warning");
  assert.equal(pressure.statusLabel, "PRESSURE");
  assert.match(pressure.detail, /one more sender include/);

  const overLimit = scan.buildSpfFinding(
    baseScanPayload({
      status: "FAIL",
      spf: {
        valid: true,
        lookups: 12,
        record: "v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all",
      },
    }),
  );
  assert.equal(overLimit.tone, "fail");
  assert.match(overLimit.headline, /above the receiver limit/);
});

test("dashboard domain creation posts through the frontend dashboard proxy", async () => {
  const previousFetch = globalThis.fetch;
  const observed = {};

  globalThis.fetch = async (url, init) => {
    observed.url = url;
    observed.method = init?.method;
    observed.contentType = init?.headers?.["content-type"];
    observed.body = init?.body;
    return new Response(
      JSON.stringify({
        id: "domain-created",
        domain: "kastro.is",
        status: "monitoring",
        score: 0,
        dmarc_policy: "none",
        spf_lookup_count: 0,
        dkim_coverage: "unknown",
        alignment_rate: 0,
        unknown_sender_count: 0,
        next_action: "Run the first monitoring check.",
      }),
      { status: 201, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const dashboard = loadTSModule("lib/dashboard.ts");
    const domain = await dashboard.createDashboardDomain(" kastro.is ");

    assert.equal(observed.url, "/api/dashboard/domains");
    assert.equal(observed.method, "POST");
    assert.equal(observed.contentType, "application/json");
    assert.deepEqual(JSON.parse(observed.body), { domain: "kastro.is" });
    assert.equal(domain.id, "domain-created");
    assert.equal(domain.domain, "kastro.is");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("dashboard API route maps domain creation to the backend domain API", () => {
  const source = readFileSync(join(root, "app/api/dashboard/[[...path]]/route.ts"), "utf8");

  assert.match(source, /backendDashboardPath\(request, context, "POST"\)/);
  assert.match(source, /return `\/api\/v1\/domains/);
});

test("admin temp login gives operator feedback when access guard stays closed", () => {
  const routeSource = readFileSync(join(root, "app/api/admin/temp-login/route.ts"), "utf8");
  const pageSource = readFileSync(join(root, "app/admin/page.tsx"), "utf8");

  assert.match(routeSource, /isAdminAccessEnabled\(\)/);
  assert.match(routeSource, /url\.searchParams\.set\("login", "closed"\)/);
  assert.match(pageSource, /loginStatus/);
  assert.match(pageSource, /DMARK_ADMIN_ACCESS/);
});

test("Authentik config derives OIDC endpoints and stays disabled until complete", () => {
  const previous = snapshotEnv([
    "DMARK_AUTHENTIK_CLIENT_ID",
    "DMARK_AUTHENTIK_CLIENT_SECRET",
    "DMARK_AUTHENTIK_ISSUER",
    "DMARK_AUTHENTIK_REDIRECT_URI",
    "DMARK_AUTHENTIK_SESSION_SECRET",
  ]);

  try {
    const authentik = loadTSModule("lib/authentik-access.ts");
    delete process.env.DMARK_AUTHENTIK_CLIENT_ID;
    delete process.env.DMARK_AUTHENTIK_CLIENT_SECRET;
    delete process.env.DMARK_AUTHENTIK_ISSUER;
    delete process.env.DMARK_AUTHENTIK_REDIRECT_URI;
    delete process.env.DMARK_AUTHENTIK_SESSION_SECRET;
    assert.equal(authentik.getAuthentikConfig(), null);

    process.env.DMARK_AUTHENTIK_ISSUER = "https://auth.kastro.is/application/o/dmark";
    process.env.DMARK_AUTHENTIK_CLIENT_ID = "dmark-client";
    process.env.DMARK_AUTHENTIK_CLIENT_SECRET = ["fixture", "client", "secret"].join("-");
    process.env.DMARK_AUTHENTIK_REDIRECT_URI = "https://dmark.is/api/auth/callback";
    process.env.DMARK_AUTHENTIK_SESSION_SECRET = ["fixture", "session", "secret"].join("-");

    const config = authentik.getAuthentikConfig();
    assert.equal(config.issuer, "https://auth.kastro.is/application/o/dmark/");
    assert.equal(config.authorizationEndpoint, "https://auth.kastro.is/application/o/authorize/");
    assert.equal(config.tokenEndpoint, "https://auth.kastro.is/application/o/token/");
    assert.equal(config.userInfoEndpoint, "https://auth.kastro.is/application/o/userinfo/");
    assert.equal(JSON.stringify(config).includes("fixture-client-secret"), false);
  } finally {
    restoreEnvSnapshot(previous);
  }
});

test("Authentik sessions are signed, expiring, and authorize configured owner emails or groups", () => {
  const previous = snapshotEnv([
    "DMARK_AUTHENTIK_ALLOWED_EMAILS",
    "DMARK_AUTHENTIK_ALLOWED_GROUPS",
    "DMARK_AUTHENTIK_CLIENT_ID",
    "DMARK_AUTHENTIK_CLIENT_SECRET",
    "DMARK_AUTHENTIK_ISSUER",
    "DMARK_AUTHENTIK_REDIRECT_URI",
    "DMARK_AUTHENTIK_SESSION_SECRET",
  ]);

  try {
    const authentik = loadTSModule("lib/authentik-access.ts");
    process.env.DMARK_AUTHENTIK_ISSUER = "https://auth.kastro.is/application/o/dmark/";
    process.env.DMARK_AUTHENTIK_CLIENT_ID = "dmark-client";
    process.env.DMARK_AUTHENTIK_CLIENT_SECRET = ["fixture", "client", "secret"].join("-");
    process.env.DMARK_AUTHENTIK_REDIRECT_URI = "https://dmark.is/api/auth/callback";
    process.env.DMARK_AUTHENTIK_SESSION_SECRET = ["fixture", "session", "secret"].join("-");
    process.env.DMARK_AUTHENTIK_ALLOWED_EMAILS = "andri@example.is";
    process.env.DMARK_AUTHENTIK_ALLOWED_GROUPS = "dmark-admins";

    assert.equal(authentik.isAuthentikUserAllowed({ email: "andri@example.is", groups: [] }), true);
    assert.equal(authentik.isAuthentikUserAllowed({ email: "other@example.is", groups: ["dmark-admins"] }), true);
    assert.equal(authentik.isAuthentikUserAllowed({ email: "other@example.is", groups: ["customers"] }), false);

    const session = authentik.signAuthentikSession({ email: "andri@example.is", name: "Andri", groups: ["dmark-admins"] }, 1893456000);
    assert.equal(authentik.verifyAuthentikSession(session, 1893455000)?.email, "andri@example.is");
    assert.equal(authentik.verifyAuthentikSession(`${session}tampered`, 1893455000), null);
    assert.equal(authentik.verifyAuthentikSession(session, 1893457000), null);
  } finally {
    restoreEnvSnapshot(previous);
  }
});

test("admin page exposes Authentik login before temporary password fallback", () => {
  const source = readFileSync(join(root, "app/admin/page.tsx"), "utf8");

  assert.match(source, /isAuthentikOIDCEnabled/);
  assert.match(source, /\/api\/auth\/login/);
  assert.match(source, /Sign in with Authentik/);
});

test("dashboard backend allowlist includes domain creation without opening admin paths", () => {
  const previousBase = process.env.DMARK_API_BASE_URL;

  try {
    process.env.DMARK_API_BASE_URL = "https://dmark.kastro.is";
    const api = loadTSModule("lib/dashboard-api.ts");

    assert.equal(api.dashboardBackendURL("/api/v1/domains").toString(), "https://dmark.kastro.is/api/v1/domains");
    assert.throws(() => api.dashboardBackendURL("/api/v1/admin/provider-health"), /not allowed/);
  } finally {
    restoreEnv("DMARK_API_BASE_URL", previousBase);
  }
});

test("dashboard API client attaches bearer token and uses DMARK_API aliases", async () => {
  const previousBase = process.env.DMARK_API_BASE_URL;
  const previousToken = process.env.DMARK_API_TOKEN;
  const previousAppBase = process.env.DMARK_APP_API_BASE_URL;
  const previousAppToken = process.env.DMARK_APP_API_TOKEN;
  const previousTimeout = process.env.DMARK_API_TIMEOUT_MS;
  const previousFetch = globalThis.fetch;

  process.env.DMARK_API_BASE_URL = "https://backend.example";
  process.env.DMARK_API_TOKEN = "meil_test_token";
  delete process.env.DMARK_APP_API_BASE_URL;
  delete process.env.DMARK_APP_API_TOKEN;
  process.env.DMARK_API_TIMEOUT_MS = "1000";

  let observed;
  globalThis.fetch = async (url, init) => {
    observed = { url: String(url), authorization: init.headers.get("authorization"), accept: init.headers.get("accept") };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const api = loadTSModule("lib/dashboard-api.ts");
    await api.dashboardProxyFetch("/api/v1/dashboard/domains");
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnv("DMARK_API_BASE_URL", previousBase);
    restoreEnv("DMARK_API_TOKEN", previousToken);
    restoreEnv("DMARK_APP_API_BASE_URL", previousAppBase);
    restoreEnv("DMARK_APP_API_TOKEN", previousAppToken);
    restoreEnv("DMARK_API_TIMEOUT_MS", previousTimeout);
  }

  assert.equal(observed.url, "https://backend.example/api/v1/dashboard/domains");
  assert.equal(observed.authorization, "Bearer meil_test_token");
  assert.equal(observed.accept, "application/json");
});

test("dashboard API client maps backend error JSON", async () => {
  const previousBase = process.env.DMARK_API_BASE_URL;
  const previousToken = process.env.DMARK_API_TOKEN;
  const previousFetch = globalThis.fetch;

  process.env.DMARK_API_BASE_URL = "https://backend.example";
  process.env.DMARK_API_TOKEN = "meil_test_token";
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "missing reporter scope" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    });

  try {
    const api = loadTSModule("lib/dashboard-api.ts");
    await assert.rejects(() => api.dashboardProxyFetch("/api/v1/dashboard/reporter"), {
      name: "DashboardAPIError",
      message: "missing reporter scope",
      status: 403,
    });
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnv("DMARK_API_BASE_URL", previousBase);
    restoreEnv("DMARK_API_TOKEN", previousToken);
  }
});

test("dashboard access is closed by default and only opens by explicit server env", () => {
  const previousAccess = process.env.DMARK_DASHBOARD_ACCESS;
  const previousEnabled = process.env.DMARK_DASHBOARD_ENABLED;

  try {
    const access = loadTSModule("lib/dashboard-access.ts");

    delete process.env.DMARK_DASHBOARD_ACCESS;
    delete process.env.DMARK_DASHBOARD_ENABLED;
    assert.equal(access.isDashboardAccessEnabled(), false);

    process.env.DMARK_DASHBOARD_ACCESS = "closed";
    assert.equal(access.isDashboardAccessEnabled(), false);

    process.env.DMARK_DASHBOARD_ACCESS = "open";
    assert.equal(access.isDashboardAccessEnabled(), true);

    process.env.DMARK_DASHBOARD_ACCESS = "false";
    process.env.DMARK_DASHBOARD_ENABLED = "1";
    assert.equal(access.isDashboardAccessEnabled(), true);

    assert.equal(access.dashboardLockedResponseBody().error, "Dashboard access is closed until the private beta is ready.");
  } finally {
    restoreEnv("DMARK_DASHBOARD_ACCESS", previousAccess);
    restoreEnv("DMARK_DASHBOARD_ENABLED", previousEnabled);
  }
});

test("dashboard response mapper renders summary metrics and domain next action", () => {
  const dashboard = loadTSModule("lib/dashboard.ts");
  const view = dashboard.mapDashboardResponse({
    generated_at: "2026-05-28T12:00:00Z",
    protected_domain_count: 1,
    average_score: 88,
    alert_count: 2,
    unknown_sender_count: 3,
    domains: [
      {
        id: "domain-1",
        domain: "example.is",
        status: "needs-work",
        score: 88,
        dmarc_policy: "quarantine",
        spf_lookup_count: 7,
        dkim_coverage: "covered",
        alignment_rate: 94.25,
        unknown_sender_count: 3,
        next_action: "Review unknown senders.",
      },
    ],
  });

  assert.equal(view.metrics[0].value, "1");
  assert.equal(view.metrics[2].value, "2");
  assert.equal(view.metrics[3].value, "3");
  assert.equal(view.protectedDomains[0].status, "needs-work");
  assert.equal(view.protectedDomains[0].nextAction, "Review unknown senders.");
});

test("brand risk mapper preserves DNS evidence and inactive candidate semantics", () => {
  const dashboard = loadTSModule("lib/dashboard.ts");
  const view = dashboard.mapBrandRiskResponse({
    domain_id: "domain-1",
    domain: "example.is",
    generated_at: "2026-05-28T12:00:00Z",
    findings: [
      {
        category: "Email authentication",
        type: "dmarc",
        title: "DMARC policy is relaxed",
        severity: "High",
        evidence: "p=none observed",
        recommended_action: "Move toward enforcement.",
      },
    ],
    lookalikes: [
      {
        domain: "examp1e.is",
        kind: "typo",
        reason: "Numeric substitution",
        has_address_records: true,
        has_mx_records: true,
        severity: "High",
        evidence: "A and MX records observed",
        recommended_action: "Review ownership.",
      },
      {
        domain: "exámple.is",
        kind: "homoglyph",
        reason: "Accent variation",
        has_address_records: false,
        has_mx_records: false,
        severity: "Info",
        evidence: "No DNS evidence observed",
        recommended_action: "Track only.",
      },
    ],
  });

  assert.equal(view.findings[0].severity, "High");
  assert.equal(view.lookalikes[0].activeEvidence, true);
  assert.equal(view.lookalikes[0].hasMXRecords, true);
  assert.equal(view.lookalikes[1].activeEvidence, false);
  assert.equal(view.lookalikes[1].severity, "Info");
});

test("settings mapper and payload clamp threshold to 1..100", () => {
  const dashboard = loadTSModule("lib/dashboard.ts");

  assert.equal(
    dashboard.mapSettingsResponse({
      require_alignment_before_reject: 120,
      pause_automation_on_unknown_senders_spike: true,
      auto_generate_monthly_executive_reports: false,
      notification_channels: ["email"],
    }).alignmentThreshold,
    100,
  );

  assert.equal(
    dashboard.settingsToBackendPayload({
      alignmentThreshold: 0,
      pauseOnUnknownSpike: false,
      monthlyReports: true,
      notificationChannels: ["slack"],
    }).require_alignment_before_reject,
    1,
  );
});

test("SPF route mapper preserves route state, CNAME instructions, sources, and safe errors", () => {
  const dashboard = loadTSModule("lib/dashboard.ts");
  const view = dashboard.mapSPFRouteResponse({
    id: "route-1",
    domain_id: "domain-1",
    domain: "example.is",
    status: "failed",
    route_fqdn: "example-is.route.dmark.is",
    customer_cname_name: "_spf.example.is",
    customer_cname_target: "example-is.route.dmark.is",
    generated_spf_preview: "v=spf1 include:_spf.mailgun.org ~all",
    last_published_spf: "v=spf1 include:_spf.mailgun.org ~all",
    last_synced_at: "2026-05-31T12:00:00Z",
    last_sync_error: "SPF route sync failed; see operational events for operator details",
    enabled_sources: [
      { kind: "include", value: "_spf.mailgun.org", label: "Mailgun" },
      { kind: "ip4", value: "203.0.113.10", label: "Office gateway" },
    ],
    evidence_summary: [
      {
        source_value: "_spf.mailgun.org",
        resolved_domain: "_spf.mailgun.org",
        mechanism: "include:_spf.mailgun.org",
        kind: "include",
        message: "resolved",
      },
    ],
  });

  assert.equal(view.id, "route-1");
  assert.equal(view.domainID, "domain-1");
  assert.equal(view.domain, "example.is");
  assert.equal(view.status, "failed");
  assert.equal(view.routeFQDN, "example-is.route.dmark.is");
  assert.equal(view.customerCNAMEName, "_spf.example.is");
  assert.equal(view.customerCNAMETarget, "example-is.route.dmark.is");
  assert.equal(view.generatedSPFPreview, "v=spf1 include:_spf.mailgun.org ~all");
  assert.equal(view.lastPublishedSPF, "v=spf1 include:_spf.mailgun.org ~all");
  assert.equal(view.lastSyncedAt, "2026-05-31T12:00:00Z");
  assert.match(view.lastSyncError, /operational events/);
  assert.deepEqual(
    Array.from(view.enabledSources.map((source) => `${source.kind}:${source.value}:${source.label}`)),
    ["include:_spf.mailgun.org:Mailgun", "ip4:203.0.113.10:Office gateway"],
  );
  assert.equal(view.evidenceSummary[0].message, "resolved");
});

test("SPF route client uses the dashboard proxy path without backend credentials", async () => {
  const previousFetch = globalThis.fetch;
  let observed;
  globalThis.fetch = async (url, init) => {
    observed = { url: String(url), cache: init.cache };
    return new Response(
      JSON.stringify({
        id: "route-1",
        domain_id: "domain-1",
        domain: "example.is",
        status: "ready",
        route_fqdn: "example-is.route.dmark.is",
        enabled_sources: [],
        evidence_summary: [],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  try {
    const dashboard = loadTSModule("lib/dashboard.ts");
    const view = await dashboard.getSPFRouteData("domain-1");
    assert.equal(view.routeFQDN, "example-is.route.dmark.is");
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(observed.url, "/api/dashboard/domains/domain-1/spf-route");
  assert.equal(observed.cache, "no-store");
});

test("SPF route panel model renders CNAME instructions, sync state, and safe operator evidence", () => {
  const dashboard = loadTSModule("lib/dashboard.ts");
  const model = dashboard.buildSPFRoutePanelModel({
    id: "route-1",
    domainID: "domain-1",
    domain: "example.is",
    status: "failed",
    routeFQDN: "example-is.route.dmark.is",
    customerCNAMEName: "_spf.example.is",
    customerCNAMETarget: "example-is.route.dmark.is",
    generatedSPFPreview: "v=spf1 include:_spf.mailgun.org ip4:203.0.113.10 ~all",
    lastPublishedSPF: "v=spf1 include:_spf.mailgun.org ~all",
    lastSyncedAt: "2026-06-01T12:00:00Z",
    lastSyncError: "SPF route sync failed; see operational events for operator details",
    enabledSources: [
      { kind: "include", value: "_spf.mailgun.org", label: "Mailgun" },
      { kind: "ip4", value: "203.0.113.10", label: "Office gateway" },
    ],
    evidenceSummary: [{ kind: "include", message: "resolved include:_spf.mailgun.org", mechanism: "include:_spf.mailgun.org" }],
  });

  assert.equal(model.heading, "SPF route for example.is");
  assert.equal(model.statusLabel, "Failed");
  assert.equal(model.statusTone, "red");
  assert.equal(model.cnameInstruction, "_spf.example.is CNAME example-is.route.dmark.is");
  assert.equal(model.routeTarget, "example-is.route.dmark.is");
  assert.match(model.lastSyncLabel, /ago|2026|not synced/);
  assert.deepEqual(Array.from(model.sourceLabels), ["Mailgun · include:_spf.mailgun.org", "Office gateway · ip4:203.0.113.10"]);
  assert.match(model.evidenceLabels[0], /resolved/);
  assert.match(model.errorSummary, /operational events/);
  assert.equal(JSON.stringify(model).includes("DMARK_API_TOKEN"), false);
  assert.equal(JSON.stringify(model).includes("BUNNY"), false);
});

test("SPF route sync client uses the dashboard proxy POST path and maps queue state", async () => {
  const previousFetch = globalThis.fetch;
  let observed;
  globalThis.fetch = async (url, init) => {
    observed = { url: String(url), method: init.method, cache: init.cache, body: init.body };
    return new Response(
      JSON.stringify({
        job_id: "spf-sync-job-1",
        domain_id: "domain-1",
        status: "queued",
        queued_at: "2026-06-01T18:30:00Z",
      }),
      { status: 202, headers: { "content-type": "application/json" } },
    );
  };

  let result;
  try {
    const dashboard = loadTSModule("lib/dashboard.ts");
    result = await dashboard.syncSPFRoute("domain-1");
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(observed.url, "/api/dashboard/domains/domain-1/spf-route/sync");
  assert.equal(observed.method, "POST");
  assert.equal(observed.cache, "no-store");
  assert.equal(observed.body, undefined);
  assert.equal(result.jobID, "spf-sync-job-1");
  assert.equal(result.domainID, "domain-1");
  assert.equal(result.status, "queued");
  assert.equal(result.queuedAt, "2026-06-01T18:30:00Z");
});

test("DNS guidance mapper preserves provider detection, fallback certainty, and record instructions", () => {
  const dashboard = loadTSModule("lib/dashboard.ts");
  const view = dashboard.mapDNSGuidanceResponse({
    domain_id: "domain-1",
    domain: "example.is",
    generated_at: "2026-06-01T19:00:00Z",
    detection: {
      status: "detected",
      provider_id: "cloudflare",
      provider_name: "Cloudflare",
      confidence: "high",
      evidence_nameservers: ["alice.ns.cloudflare.com.", "bob.ns.cloudflare.com."],
      dns_dashboard_url: "https://dash.cloudflare.com",
    },
    instructions: [
      {
        kind: "dmarc_txt",
        record_name: "_dmarc.example.is",
        record_type: "TXT",
        record_value: "v=DMARC1; p=none; rua=mailto:dmarc@example.is",
        ttl: 3600,
        provider_id: "cloudflare",
        provider_name: "Cloudflare",
        dashboard_url: "https://dash.cloudflare.com",
        steps: ["Open Cloudflare DNS.", "Add the TXT record."],
      },
      {
        kind: "spf_route_cname",
        record_name: "_spf.example.is",
        record_type: "CNAME",
        record_value: "example-is.route.dmark.is",
        ttl: 300,
        provider_name: "Cloudflare",
        steps: ["Create the CNAME delegation."],
      },
    ],
  });

  assert.equal(view.domainID, "domain-1");
  assert.equal(view.statusLabel, "Detected: Cloudflare");
  assert.equal(view.statusTone, "green");
  assert.equal(view.confidenceLabel, "high confidence");
  assert.deepEqual(Array.from(view.evidenceNameservers), ["alice.ns.cloudflare.com.", "bob.ns.cloudflare.com."]);
  assert.equal(view.instructions[0].record, "_dmarc.example.is TXT v=DMARC1; p=none; rua=mailto:dmarc@example.is");
  assert.equal(view.instructions[1].recordType, "CNAME");
  assert.equal(JSON.stringify(view).includes("api_key"), false);
  assert.equal(JSON.stringify(view).includes("BUNNY"), false);
});

test("DNS guidance client uses dashboard proxy path and maps unknown fallback", async () => {
  const previousFetch = globalThis.fetch;
  let observed;
  globalThis.fetch = async (url, init) => {
    observed = { url: String(url), cache: init.cache };
    return new Response(
      JSON.stringify({
        domain_id: "domain-1",
        domain: "example.is",
        generated_at: "2026-06-01T19:00:00Z",
        detection: {
          status: "unknown",
          confidence: "unknown",
          evidence_nameservers: [],
        },
        resolver_error: "dns_lookup_failed",
        instructions: [
          {
            kind: "spf_txt",
            record_name: "example.is",
            record_type: "TXT",
            record_value: "v=spf1 ~all",
            ttl: 3600,
            provider_name: "Generic DNS",
            steps: ["Open your DNS provider."],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  let result;
  try {
    const dashboard = loadTSModule("lib/dashboard.ts");
    result = await dashboard.getDNSGuidanceData("domain-1");
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(observed.url, "/api/dashboard/domains/domain-1/dns-guidance");
  assert.equal(observed.cache, "no-store");
  assert.equal(result.statusLabel, "Provider unknown");
  assert.equal(result.statusTone, "amber");
  assert.equal(result.resolverError, "dns_lookup_failed");
  assert.equal(result.instructions[0].providerName, "Generic DNS");
});

test("dashboard component wires DNS provider guidance without browser credentials or false certainty", () => {
  const source = readFileSync(join(root, "components/dmark-dashboard.tsx"), "utf8");

  assert.match(source, /getDNSGuidanceData/);
  assert.match(source, /DNSGuidancePanel/);
  assert.match(source, /Provider unknown/);
  assert.match(source, /detected, ambiguous, or unknown/);
  assert.match(source, /Copy DNS record/);
  assert.equal(source.includes("DMARK_API_TOKEN"), false);
  assert.equal(source.includes("BUNNY"), false);
});

test("SPF route source update client uses dashboard proxy PUT with only source payload", async () => {
  const previousFetch = globalThis.fetch;
  let observed;
  globalThis.fetch = async (url, init) => {
    observed = { url: String(url), method: init.method, cache: init.cache, headers: init.headers, body: init.body };
    return new Response(
      JSON.stringify({
        id: "route-1",
        domain_id: "domain-1",
        domain: "example.is",
        status: "pending",
        route_fqdn: "example-is.route.dmark.is",
        enabled_sources: [{ kind: "include", value: "_spf.mailgun.org", label: "Mailgun" }],
        evidence_summary: [],
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };

  let result;
  try {
    const dashboard = loadTSModule("lib/dashboard.ts");
    result = await dashboard.saveSPFRouteSources("domain-1", [
      { kind: "include", value: "_spf.mailgun.org", label: "Mailgun" },
      { kind: "ip4", value: "203.0.113.10", label: "Office gateway" },
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.equal(observed.url, "/api/dashboard/domains/domain-1/spf-route");
  assert.equal(observed.method, "PUT");
  assert.equal(observed.cache, "no-store");
  assert.equal(observed.headers["content-type"], "application/json");
  const body = JSON.parse(observed.body);
  assert.deepEqual(body.sources, [
    { kind: "include", value: "_spf.mailgun.org", label: "Mailgun", enabled: true },
    { kind: "ip4", value: "203.0.113.10", label: "Office gateway", enabled: true },
  ]);
  assert.equal(body.enabled, true);
  assert.equal(JSON.stringify(body).includes("BUNNY"), false);
  assert.equal(result.status, "pending");
});

test("dashboard component wires SPF route source management without browser credentials", () => {
  const source = readFileSync(join(root, "components/dmark-dashboard.tsx"), "utf8");

  assert.match(source, /getSPFRouteData/);
  assert.match(source, /syncSPFRoute/);
  assert.match(source, /saveSPFRouteSources/);
  assert.match(source, /SPFRoutePanel/);
  assert.match(source, /setSpfRouteState\("loading"\)/);
  assert.match(source, /setSyncingSPFRoute\(true\)/);
  assert.match(source, /Manual sync queues a backend job/);
  assert.match(source, /SPF source management/);
  assert.match(source, /include, ip4, and ip6 sources/);
  assert.equal(source.includes("DMARK_API_TOKEN"), false);
  assert.equal(source.includes("BUNNY"), false);
});

test("public scan remediation plan prioritises SPF flattening before DMARC enforcement", () => {
  const scan = loadTSModule("lib/scan.ts");
  const plan = scan.buildScanRemediationPlan({
    domain: "example.is",
    status: "FAIL",
    spf: {
      valid: false,
      lookups: 14,
      record: "v=spf1 include:_spf.google.com include:spf.protection.outlook.com include:sendgrid.net -all",
    },
    dmarc: {
      valid: false,
      policy: "none",
      record: "v=DMARC1; p=none; rua=mailto:dmarc@example.is",
    },
    spoofable: true,
  });

  assert.equal(plan.summary, "Fix SPF lookup pressure before moving DMARC to enforcement.");
  assert.deepEqual(
    Array.from(plan.steps.map((step) => step.title)),
    ["Flatten SPF includes", "Keep monitoring DMARC reports", "Move toward p=reject"],
  );
  assert.equal(plan.steps[0].tone, "critical");
  assert.match(plan.steps[0].detail, /14 DNS lookups/);
});

test("public scan remediation plan keeps enforcing domains in monitoring mode", () => {
  const scan = loadTSModule("lib/scan.ts");
  const plan = scan.buildScanRemediationPlan({
    domain: "kastro.is",
    status: "PASS",
    spf: {
      valid: true,
      lookups: 5,
      record: "v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all",
    },
    dmarc: {
      valid: true,
      policy: "reject",
      record: "v=DMARC1; p=reject; rua=mailto:dmarc@kastro.is",
    },
    spoofable: false,
  });

  assert.equal(plan.summary, "Domain is enforcing; keep watching for sender and DNS drift.");
  assert.deepEqual(
    Array.from(plan.steps.map((step) => step.title)),
    ["Keep SPF below the limit", "Keep DMARC at p=reject", "Watch new senders"],
  );
  assert.equal(plan.steps.every((step) => step.tone === "stable"), true);
});

test("public scanner explains p=quarantine as partial DMARC enforcement", () => {
  const scan = loadTSModule("lib/scan.ts");
  const finding = scan.buildDmarcFinding({
    domain: "kastro.is",
    status: "PASS",
    spf: {
      valid: true,
      lookups: 5,
      record: "v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all",
    },
    dmarc: {
      valid: true,
      policy: "quarantine",
      record: "v=DMARC1; p=quarantine; rua=mailto:dmarc@kastro.is",
    },
    spoofable: false,
  });

  assert.equal(finding.tone, "warning");
  assert.equal(finding.statusLabel, "PARTIAL");
  assert.equal(finding.headline, "PARTIAL - Policy set to p=quarantine. Suspicious mail is quarantined, but reject is not yet active.");
});

test("public scanner normalises safe domain input before scanning", () => {
  const scan = loadTSModule("lib/scan.ts");
  const validation = scan.validateScannableDomain(" https://www.KASTRO.is/mail ");

  assert.equal(validation.domain, "kastro.is");
  assert.equal(validation.error, undefined);
});

test("public scanner rejects likely mistakes before backend lookup", () => {
  const scan = loadTSModule("lib/scan.ts");

  assert.equal(scan.validateScannableDomain("andri@kastro.is").error, "Enter the domain only, not an email address.");
  assert.equal(scan.validateScannableDomain("kastro").error, "Enter a full domain such as yourcompany.is.");
  assert.equal(
    scan.validateScannableDomain("bad_domain.is").error,
    "Enter a valid domain name using letters, numbers, dots, and hyphens.",
  );
});

test("public scan evidence summary labels live DNS and demo fixtures clearly", () => {
  const scan = loadTSModule("lib/scan.ts");

  const live = scan.buildScanEvidenceSummary({
    domain: "kastro.is",
    status: "PASS",
    checkedAt: "2026-06-01T02:03:00Z",
    durationMs: 184,
    source: "live",
    spf: { valid: true, lookups: 5, record: "v=spf1 include:_spf.google.com -all" },
    dmarc: { valid: true, policy: "reject", record: "v=DMARC1; p=reject" },
    spoofable: false,
  });

  assert.equal(live.sourceLabel, "Live DNS evidence");
  assert.equal(live.durationLabel, "184ms");
  assert.match(live.checkedLabel, /1 Jun 2026/);
  assert.match(live.detail, /backend scanner response/);

  const demo = scan.buildScanEvidenceSummary(scan.mockScan("example.is"));
  assert.equal(demo.sourceLabel, "Demo fixture");
  assert.equal(demo.durationLabel, "900ms");
  assert.match(demo.detail, /local demonstration result/);
});

test("backend scan mapper marks public scan responses as live evidence", () => {
  const backend = loadTSModule("lib/backend.ts");
  const view = backend.mapScanResponse(
    {
      domain: "kastro.is",
      checked_at: "2026-06-01T02:03:00Z",
      duration_ms: 184,
      summary: { status: "pass" },
      checks: [
        { name: "spf", status: "pass", record: "v=spf1 include:_spf.google.com -all", lookup_count: 1 },
        { name: "dmarc", status: "pass", record: "v=DMARC1; p=reject" },
      ],
    },
    "fallback.is",
  );

  assert.equal(view.source, "live");
  assert.equal(view.checkedAt, "2026-06-01T02:03:00Z");
  assert.equal(view.durationMs, 184);
});

test("admin control plane access is fail-closed and requires owner session secret or temporary cookie", () => {
  const previousAccess = process.env.DMARK_ADMIN_ACCESS;
  const previousSecret = process.env.DMARK_ADMIN_OWNER_SESSION_SECRET;
  const previousTempPassword = process.env.DMARK_ADMIN_TEMP_PASSWORD;

  try {
    const adminAccess = loadTSModule("lib/admin-access.ts");

    delete process.env.DMARK_ADMIN_ACCESS;
    delete process.env.DMARK_ADMIN_OWNER_SESSION_SECRET;
    delete process.env.DMARK_ADMIN_TEMP_PASSWORD;
    assert.equal(adminAccess.isAdminAccessEnabled(), false);
    assert.equal(adminAccess.adminLockedResponseBody().error, "Admin control plane access is closed.");

    process.env.DMARK_ADMIN_ACCESS = "open";
    assert.equal(adminAccess.isAdminAccessEnabled(), true);
    assert.equal(adminAccess.isAdminOwnerSessionAllowed(new Headers()), false);

    process.env.DMARK_ADMIN_OWNER_SESSION_SECRET = "owner-test-session";
    assert.equal(adminAccess.isAdminOwnerSessionAllowed(new Headers({ "x-dmark-owner-session": "wrong" })), false);
    assert.equal(adminAccess.isAdminOwnerSessionAllowed(new Headers({ "x-dmark-owner-session": "owner-test-session" })), true);

    process.env.DMARK_ADMIN_TEMP_PASSWORD = "temporary-password";
    const cookieValue = adminAccess.signAdminTempPassword("temporary-password");
    assert.equal(adminAccess.signAdminTempPassword("wrong-password"), "");
    assert.equal(adminAccess.isAdminOwnerSessionAllowed(new Headers({ cookie: `${adminAccess.adminTempCookieName()}=${cookieValue}` })), true);
  } finally {
    restoreEnv("DMARK_ADMIN_ACCESS", previousAccess);
    restoreEnv("DMARK_ADMIN_OWNER_SESSION_SECRET", previousSecret);
    restoreEnv("DMARK_ADMIN_TEMP_PASSWORD", previousTempPassword);
  }
});

test("admin API client uses dedicated admin backend path and bearer token", async () => {
  const previousBase = process.env.DMARK_API_BASE_URL;
  const previousAdminToken = process.env.DMARK_ADMIN_API_TOKEN;
  const previousDashboardToken = process.env.DMARK_API_TOKEN;
  const previousTimeout = process.env.DMARK_API_TIMEOUT_MS;
  const previousFetch = globalThis.fetch;

  process.env.DMARK_API_BASE_URL = "https://backend.example";
  process.env.DMARK_ADMIN_API_TOKEN = "test-admin-token";
  process.env.DMARK_API_TOKEN = "dashboard-test-token";
  process.env.DMARK_API_TIMEOUT_MS = "1000";

  let observed;
  globalThis.fetch = async (url, init) => {
    observed = { url: String(url), authorization: init.headers.get("authorization"), accept: init.headers.get("accept") };
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const api = loadTSModule("lib/admin-api.ts");
    await api.adminProxyFetch("/api/v1/admin/status");
    assert.throws(() => api.adminBackendURL("/api/v1/dashboard/domains"), {
      name: "AdminAPIError",
      message: "Admin backend path is not allowed.",
    });
  } finally {
    globalThis.fetch = previousFetch;
    restoreEnv("DMARK_API_BASE_URL", previousBase);
    restoreEnv("DMARK_ADMIN_API_TOKEN", previousAdminToken);
    restoreEnv("DMARK_API_TOKEN", previousDashboardToken);
    restoreEnv("DMARK_API_TIMEOUT_MS", previousTimeout);
  }

  assert.equal(observed.url, "https://backend.example/api/v1/admin/status");
  assert.equal(observed.authorization, "Bearer test-admin-token");
  assert.equal(observed.accept, "application/json");
});

test("admin shell model is owner-only, proxy-aware, and separated from org dashboard", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const model = adminShell.buildAdminShellModel({ allowed: true });

  assert.equal(model.status, "allowed");
  assert.equal(model.eyebrow, "Owner-only control plane");
  assert.match(model.description, /global Dmark operations/);
  assert.equal(model.sections.length, 6);
  assert.deepEqual(
    Array.from(model.sections.map((section) => section.id)),
    ["cases", "spf-route-audit", "abuse-decisions", "provider-health", "operational-events", "company-onboarding"],
  );
  const auditSection = model.sections.find((section) => section.id === "spf-route-audit");
  assert.match(auditSection.description, /DNS publication drift/i);
  assert.equal(auditSection.status, "Backend endpoint ready");
  assert.equal(auditSection.endpoint, "/api/admin/spf-routes/{routeID}/publication-audit");

  const providerHealth = model.sections.find((section) => section.id === "provider-health");
  assert.equal(providerHealth.status, "Backend endpoint ready");
  assert.equal(providerHealth.endpoint, "/api/admin/provider-health");
  assert.match(providerHealth.affordance, /read-only/i);
  assert.match(providerHealth.description, /scheduler|build metadata/i);

  const operationalEvents = model.sections.find((section) => section.id === "operational-events");
  assert.equal(operationalEvents.status, "Backend endpoint ready");
  assert.equal(operationalEvents.endpoint, "/api/admin/operational-events?severity=error&limit=20");
  assert.match(operationalEvents.affordance, /redacted/i);

  assert.equal(model.sections.every((section) => section.scope === "global-owner"), true);
  assert.equal(model.sections.some((section) => /subscription|signup|self-serve/i.test(section.title + section.description)), false);
  assert.equal(JSON.stringify(model).includes("DMARK_ADMIN_API_TOKEN"), false);
  assert.equal(JSON.stringify(model).includes("DMARK_ADMIN_OWNER_SESSION_SECRET"), false);
});

test("admin provider health and operational event fetchers use relative owner proxy paths", async () => {
  const previousFetch = globalThis.fetch;
  const observed = [];

  globalThis.fetch = async (url, init) => {
    observed.push({ url: String(url), cache: init?.cache, accept: init?.headers?.accept ?? init?.headers?.get?.("accept") });
    return new Response(JSON.stringify(String(url).includes("provider-health") ? { generated_at: "2026-06-01T12:00:00Z" } : { events: [] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const adminShell = loadTSModule("lib/admin-shell.ts");
    await adminShell.fetchAdminProviderHealth();
    await adminShell.fetchAdminOperationalEvents();
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.deepEqual(observed.map((request) => request.url), ["/api/admin/provider-health", "/api/admin/operational-events?severity=error&limit=20"]);
  assert.equal(JSON.stringify(observed).includes("DMARK_ADMIN_API_TOKEN"), false);
  assert.equal(JSON.stringify(observed).includes("backend.example"), false);
});

test("admin SPF route publication audit fetcher uses encoded relative owner proxy path and rejects blanks", async () => {
  const previousFetch = globalThis.fetch;
  const observed = [];

  globalThis.fetch = async (url, init) => {
    observed.push({ url: String(url), cache: init?.cache, accept: init?.headers?.accept ?? init?.headers?.get?.("accept") });
    return new Response(JSON.stringify({ route_id: "route/1", route_fqdn: "example.route.dmark.is", status: "published" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const adminShell = loadTSModule("lib/admin-shell.ts");
    await adminShell.fetchAdminSPFRoutePublicationAudit(" route/1 ");
    await assert.rejects(() => adminShell.fetchAdminSPFRoutePublicationAudit("   "), /SPF route ID is required/);
  } finally {
    globalThis.fetch = previousFetch;
  }

  assert.deepEqual(observed.map((request) => request.url), ["/api/admin/spf-routes/route%2F1/publication-audit"]);
  assert.equal(observed[0].cache, "no-store");
  assert.equal(JSON.stringify(observed).includes("DMARK_ADMIN_API_TOKEN"), false);
  assert.equal(JSON.stringify(observed).includes("backend.example"), false);
});

test("admin SPF route publication audit mapper renders safe DNS drift evidence", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const panel = adminShell.buildSPFRoutePublicationAuditPanelModel({
    route_id: "route_123",
    route_fqdn: "example-is.route.dmark.is",
    status: "drift_detected",
    expected_records: {
      txt: [{ name: "example-is.route.dmark.is", value: "v=spf1 include:_spf.mailgun.org ~all", ttl: 300 }],
      cname: [{ name: "_spf.example.is", target: "example-is.route.dmark.is", ttl: 300 }],
    },
    live_dns: {
      authoritative: {
        status: "mismatch",
        txt: ["v=spf1 include:_spf.old.example ~all"],
        cname: ["old.route.dmark.is"],
      },
      recursive: {
        status: "propagating",
        txt: ["v=spf1 include:_spf.mailgun.org ~all"],
        cname: ["example-is.route.dmark.is"],
      },
    },
    drift_status: "mismatch",
    propagation_status: "propagating",
    last_publish: { status: "published", published_at: "2026-06-01T12:00:00Z", job_id: "job_123" },
    last_good: { checked_at: "2026-06-01T12:30:00Z", source: "authoritative" },
    bunny_api_key: "should-not-render",
    provider_response: "raw should-not-render",
  });

  assert.equal(panel.status, "available");
  assert.equal(panel.routeID, "route_123");
  assert.equal(panel.routeFQDN, "example-is.route.dmark.is");
  assert.equal(panel.statusLabel, "drift_detected");
  assert.equal(panel.driftStatus, "mismatch");
  assert.equal(panel.propagationStatus, "propagating");
  assert.deepEqual(JSON.parse(JSON.stringify(panel.expectedTXT)), [
    { label: "example-is.route.dmark.is", value: "v=spf1 include:_spf.mailgun.org ~all", meta: "TTL 300" },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.expectedCNAME)), [
    { label: "_spf.example.is", value: "example-is.route.dmark.is", meta: "TTL 300" },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.liveDNS)), [
    { label: "Authoritative", status: "mismatch", values: ["TXT v=spf1 include:_spf.old.example ~all", "CNAME old.route.dmark.is"] },
    { label: "Recursive", status: "propagating", values: ["TXT v=spf1 include:_spf.mailgun.org ~all", "CNAME example-is.route.dmark.is"] },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.publishMetadata)), [
    { label: "Last publish status", value: "published" },
    { label: "Last published at", value: "2026-06-01T12:00:00Z" },
    { label: "Last publish job", value: "job_123" },
    { label: "Last good check", value: "2026-06-01T12:30:00Z" },
    { label: "Last good source", value: "authoritative" },
  ]);
  assert.equal(JSON.stringify(panel).includes("should-not-render"), false);
  assert.equal(JSON.stringify(panel).includes("BUNNY"), false);
});

test("admin SPF route publication audit mapper supports backend audit contract", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const panel = adminShell.buildSPFRoutePublicationAuditPanelModel({
    route_id: "route-1",
    domain_id: "domain-1",
    domain: "example.com",
    expected: {
      txt: { name: "example-com.route.dmark.is", value: "v=spf1 include:_spf.mailgun.org ~all" },
      cname: { name: "example.com", target: "example-com.route.dmark.is" },
    },
    bunny_record_id: 4242,
    last_generated_spf: "v=spf1 include:_spf.mailgun.org ~all",
    last_published_spf: "v=spf1 include:_spf.mailgun.org ~all",
    last_known_good_spf: "v=spf1 include:_spf.mailgun.org ~all",
    last_sync_status: "healthy",
    last_synced_at: "2026-06-01T12:00:00Z",
    recursive: {
      txt: { values: ["v=spf1 include:_spf.mailgun.org ~all"], status: "match" },
      cname: { values: ["stale.route.dmark.is."], status: "drift" },
    },
    authoritative: { status: "not_configured" },
    propagation_status: "drift",
  });

  assert.equal(panel.status, "available");
  assert.equal(panel.routeID, "route-1");
  assert.equal(panel.routeFQDN, "example-com.route.dmark.is");
  assert.equal(panel.statusLabel, "healthy");
  assert.equal(panel.driftStatus, "drift");
  assert.equal(panel.propagationStatus, "drift");
  assert.deepEqual(JSON.parse(JSON.stringify(panel.expectedTXT)), [
    { label: "example-com.route.dmark.is", value: "v=spf1 include:_spf.mailgun.org ~all" },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.expectedCNAME)), [
    { label: "example.com", value: "example-com.route.dmark.is" },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.liveDNS)), [
    { label: "Authoritative", status: "not_configured", values: [] },
    { label: "Recursive", status: "match / drift", values: ["TXT v=spf1 include:_spf.mailgun.org ~all", "CNAME stale.route.dmark.is."] },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.publishMetadata)), [
    { label: "Last sync status", value: "healthy" },
    { label: "Last synced at", value: "2026-06-01T12:00:00Z" },
    { label: "Bunny record ID", value: "4242" },
    { label: "Last generated SPF", value: "v=spf1 include:_spf.mailgun.org ~all" },
    { label: "Last published SPF", value: "v=spf1 include:_spf.mailgun.org ~all" },
    { label: "Last known good SPF", value: "v=spf1 include:_spf.mailgun.org ~all" },
  ]);
});

test("admin SPF route publication audit mapper tolerates absent optional fields", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const panel = adminShell.buildSPFRoutePublicationAuditPanelModel({ route_id: "route_123" });

  assert.equal(panel.status, "available");
  assert.equal(panel.routeID, "route_123");
  assert.equal(panel.routeFQDN, "Unknown");
  assert.deepEqual(JSON.parse(JSON.stringify(panel.expectedTXT)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.expectedCNAME)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.liveDNS)), []);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.publishMetadata)), []);
});

test("admin provider health mapper renders safe operator-friendly labels", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const panel = adminShell.buildProviderHealthPanelModel({
    generated_at: "2026-06-01T12:00:00Z",
    public_base_url_configured: true,
    bunny_dns_configured: false,
    bunny_dns_zone_id_configured: true,
    bootstrap_configured: true,
    bootstrap_partially_configured: false,
    bootstrap_skipped: false,
    spf_route_scheduler_enabled: true,
    spf_route_scheduler_interval: "15m",
    spf_route_scheduled_sync_cadence: "hourly",
    version: "1.2.3",
    commit: "abcdef1234567890",
    build_time: "2026-06-01T11:58:00Z",
    bunny_api_key: "should-not-render",
  });

  assert.equal(panel.status, "available");
  assert.equal(panel.generatedAtLabel, "2026-06-01T12:00:00Z");
  assert.deepEqual(JSON.parse(JSON.stringify(panel.checks.map((check) => [check.label, check.value]))), [
    ["Public base URL", "Configured"],
    ["Bunny DNS", "Not configured"],
    ["Bunny DNS zone ID", "Configured"],
    ["Bootstrap", "Configured"],
    ["Bootstrap partially configured", "No"],
    ["Bootstrap skipped", "No"],
    ["SPF route scheduler", "Enabled"],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.cadence.map((item) => [item.label, item.value]))), [
    ["Scheduler interval", "15m"],
    ["Scheduled sync cadence", "hourly"],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.build.map((item) => [item.label, item.value]))), [
    ["Version", "1.2.3"],
    ["Commit", "abcdef1"],
    ["Build time", "2026-06-01T11:58:00Z"],
  ]);
  assert.equal(JSON.stringify(panel).includes("should-not-render"), false);
});

test("admin operational events mapper preserves summaries and defensively redacts secret-like metadata", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const panel = adminShell.buildOperationalEventsPanelModel({
    events: [
      {
        id: "evt_1",
        kind: "provider.sync_failed",
        severity: "error",
        message: "Provider sync failed",
        actor: "system",
        resource: "route:123",
        occurred_at: "2026-06-01T12:00:00Z",
        metadata: {
          route_id: "route_123",
          token: "super-secret-token",
          provider_response: "Bunny raw response with api key",
          nested: { password: "hidden" },
        },
      },
    ],
  });

  assert.equal(panel.status, "available");
  assert.equal(panel.events.length, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(panel.events[0])), {
    id: "evt_1",
    kind: "provider.sync_failed",
    severity: "error",
    message: "Provider sync failed",
    actor: "system",
    resource: "route:123",
    occurredAt: "2026-06-01T12:00:00Z",
    metadata: [{ label: "route_id", value: "route_123" }],
  });
  assert.equal(JSON.stringify(panel).includes("super-secret-token"), false);
  assert.equal(JSON.stringify(panel).includes("provider_response"), false);
  assert.equal(JSON.stringify(panel).includes("password"), false);
});

test("admin page source wires read-only provider panels and locked model exposes no backend admin affordances", () => {
  const pageSource = readFileSync(join(root, "app/admin/page.tsx"), "utf8");
  assert.match(pageSource, /fetchAdminProviderHealth/);
  assert.match(pageSource, /fetchAdminOperationalEvents/);
  assert.match(pageSource, /fetchAdminSPFRoutePublicationAudit/);
  assert.match(pageSource, /ProviderHealthPanel/);
  assert.match(pageSource, /OperationalEventsPanel/);
  assert.match(pageSource, /SPFRoutePublicationAuditPanel/);

  const adminShell = loadTSModule("lib/admin-shell.ts");
  const locked = adminShell.buildAdminShellModel({ allowed: false });
  assert.equal(JSON.stringify(locked).includes("/api/admin/provider-health"), false);
  assert.equal(JSON.stringify(locked).includes("/api/admin/operational-events"), false);
  assert.equal(JSON.stringify(locked).includes("/api/admin/spf-routes"), false);
  assert.equal(JSON.stringify(locked).includes("DMARK_ADMIN_API_TOKEN"), false);
});

test("admin shell locked model is fail-closed without backend affordances", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const model = adminShell.buildAdminShellModel({ allowed: false });

  assert.equal(model.status, "locked");
  assert.equal(model.sections.length, 0);
  assert.match(model.title, /locked/i);
  assert.match(model.description, /owner session/i);
  assert.equal(JSON.stringify(model).includes("/api/v1/admin"), false);
});

function snapshotEnv(keys) {
  return Object.fromEntries(keys.map((key) => [key, process.env[key]]));
}

function restoreEnvSnapshot(snapshot) {
  for (const [key, value] of Object.entries(snapshot)) {
    restoreEnv(key, value);
  }
}

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
