import assert from "node:assert/strict";
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
    DOMException,
    Error,
    Headers,
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
      throw new Error(`Unexpected require: ${specifier}`);
    },
    setTimeout,
  };

  vm.runInNewContext(outputText, sandbox, { filename });
  return cjsModule.exports;
}

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

function restoreEnv(key, value) {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}
