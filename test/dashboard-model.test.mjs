import assert from "node:assert/strict";
import { timingSafeEqual } from "node:crypto";
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
      if (specifier === "node:crypto") return { timingSafeEqual };
      throw new Error(`Unexpected require: ${specifier}`);
    },
    setTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename });
  return cjsModule.exports;
}

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

test("admin control plane access is fail-closed and requires owner session secret", () => {
  const previousAccess = process.env.DMARK_ADMIN_ACCESS;
  const previousSecret = process.env.DMARK_ADMIN_OWNER_SESSION_SECRET;

  try {
    const adminAccess = loadTSModule("lib/admin-access.ts");

    delete process.env.DMARK_ADMIN_ACCESS;
    delete process.env.DMARK_ADMIN_OWNER_SESSION_SECRET;
    assert.equal(adminAccess.isAdminAccessEnabled(), false);
    assert.equal(adminAccess.adminLockedResponseBody().error, "Admin control plane access is closed.");

    process.env.DMARK_ADMIN_ACCESS = "open";
    assert.equal(adminAccess.isAdminAccessEnabled(), true);
    assert.equal(adminAccess.isAdminOwnerSessionAllowed(new Headers()), false);

    process.env.DMARK_ADMIN_OWNER_SESSION_SECRET = "owner-test-session";
    assert.equal(adminAccess.isAdminOwnerSessionAllowed(new Headers({ "x-dmark-owner-session": "wrong" })), false);
    assert.equal(adminAccess.isAdminOwnerSessionAllowed(new Headers({ "x-dmark-owner-session": "owner-test-session" })), true);
  } finally {
    restoreEnv("DMARK_ADMIN_ACCESS", previousAccess);
    restoreEnv("DMARK_ADMIN_OWNER_SESSION_SECRET", previousSecret);
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

test("admin shell locked model is fail-closed without backend affordances", () => {
  const adminShell = loadTSModule("lib/admin-shell.ts");
  const model = adminShell.buildAdminShellModel({ allowed: false });

  assert.equal(model.status, "locked");
  assert.equal(model.sections.length, 0);
  assert.match(model.title, /locked/i);
  assert.match(model.description, /owner session/i);
  assert.equal(JSON.stringify(model).includes("/api/v1/admin"), false);
});

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
