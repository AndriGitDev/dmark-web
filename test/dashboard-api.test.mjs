import assert from "node:assert/strict";
import test from "node:test";
import { loadTSModule } from "./load-ts.mjs";

function withEnv(values, run) {
  const previous = {};
  for (const [key, value] of Object.entries(values)) {
    previous[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const restore = () => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  };
  try {
    const result = run();
    if (result && typeof result.then === "function") {
      return result.finally(restore);
    }
    restore();
    return result;
  } catch (error) {
    restore();
    throw error;
  }
}

test("dashboard backend URL allowlist permits only dashboard and domain-create paths", () => {
  withEnv({ DMARK_API_BASE_URL: "https://backend.example", DMARK_APP_API_BASE_URL: undefined }, () => {
    const api = loadTSModule("lib/dashboard-api.ts");

    for (const path of [
      "/api/v1/dashboard",
      "/api/v1/dashboard/domains/domain-1/trends?days=30",
      "/api/v1/dashboard/domains/domain-1/spf-route/history",
      "/api/v1/dashboard/plan",
      "/api/v1/domains",
    ]) {
      assert.equal(api.dashboardBackendURL(path).origin, "https://backend.example", path);
    }

    for (const path of ["/api/v1/admin/provider-health", "/api/v1/scan", "/healthz", "/api/v1/domains/import"]) {
      assert.throws(() => api.dashboardBackendURL(path), /not allowed/, path);
    }
  });
});

test("dashboard backend URL fails closed without a configured base", () => {
  withEnv({ DMARK_API_BASE_URL: undefined, DMARK_APP_API_BASE_URL: undefined }, () => {
    const api = loadTSModule("lib/dashboard-api.ts");
    assert.throws(() => api.dashboardBackendURL("/api/v1/dashboard"), /not configured/);
  });
});

test("dashboard API errors map to safe status/body pairs", () => {
  const api = loadTSModule("lib/dashboard-api.ts");

  const known = api.dashboardAPIErrorResponse(new api.DashboardAPIError("backend says no", 503));
  assert.equal(known.status, 503);
  assert.equal(known.body.error, "backend says no");

  const unknown = api.dashboardAPIErrorResponse(new Error("raw internal failure with secrets"));
  assert.equal(unknown.status, 502);
  assert.equal(unknown.body.error, "Dashboard backend request failed.");
  assert.equal(JSON.stringify(unknown).includes("secrets"), false);
});

test("dashboard error messages prefer structured payload fields", async () => {
  const api = loadTSModule("lib/dashboard-api.ts");

  const jsonResponse = new Response(JSON.stringify({ error: "domain was not found" }), {
    status: 404,
    headers: { "content-type": "application/json" },
  });
  assert.equal(await api.dashboardErrorMessage(jsonResponse), "domain was not found");

  const textResponse = new Response("plain failure", { status: 500, headers: { "content-type": "text/plain" } });
  assert.equal(await api.dashboardErrorMessage(textResponse), "plain failure");

  const emptyResponse = new Response("", { status: 500, headers: { "content-type": "text/plain" } });
  assert.equal(await api.dashboardErrorMessage(emptyResponse), "Dashboard backend returned 500.");
});
