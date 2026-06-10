import assert from "node:assert/strict";
import test from "node:test";
import { loadTSModule } from "./load-ts.mjs";

const ROUTE = "app/api/dashboard/[[...path]]/route.ts";

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

function mockEnv() {
  return {
    DMARK_DASHBOARD_ACCESS: "open",
    DMARK_DASHBOARD_MOCK: "1",
    DMARK_DASHBOARD_AUTHENTIK_ISSUER: "https://auth.kastro.test/application/o/dmark-dashboard/",
    DMARK_DASHBOARD_AUTHENTIK_CLIENT_ID: "dmark-dashboard",
    DMARK_DASHBOARD_AUTHENTIK_CLIENT_SECRET: "secret",
    DMARK_DASHBOARD_AUTHENTIK_REDIRECT_URI: "https://dmark.test/api/dashboard/auth/callback",
    DMARK_DASHBOARD_AUTHENTIK_SESSION_SECRET: "session-secret-with-entropy",
    DMARK_DASHBOARD_AUTHENTIK_ALLOWED_EMAILS: "customer@example.is",
  };
}

function sessionCookie() {
  const access = loadTSModule("lib/dashboard-authentik-access.ts");
  const value = access.signDashboardAuthentikSession({ email: "customer@example.is" });
  return `${access.dashboardAuthentikSessionCookieName()}=${value}`;
}

function dashboardRequest(path, cookie) {
  return new Request(`https://dmark.test/api/dashboard${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

function routeContext(path) {
  const segments = path.split("?")[0].split("/").filter(Boolean);
  return { params: Promise.resolve({ path: segments }) };
}

async function getJSON(route, path, cookie) {
  const response = await route.GET(dashboardRequest(path, cookie), routeContext(path));
  return { status: response.status, body: await response.json() };
}

test("dashboard proxy rejects unauthenticated requests with the auth-required body", async () => {
  await withEnv(mockEnv(), async () => {
    const route = loadTSModule(ROUTE);
    const { status, body } = await getJSON(route, "/plan");
    assert.equal(status, 401);
    assert.match(body.error, /login is required/i);
  });
});

test("dashboard proxy stays locked when access is closed", async () => {
  await withEnv({ ...mockEnv(), DMARK_DASHBOARD_ACCESS: "closed" }, async () => {
    const route = loadTSModule(ROUTE);
    const { status, body } = await getJSON(route, "/plan", sessionCookie());
    assert.equal(status, 403);
    assert.match(body.error, /closed/i);
  });
});

test("mock proxy serves trends with clamped days", async () => {
  await withEnv(mockEnv(), async () => {
    const route = loadTSModule(ROUTE);
    const cookie = sessionCookie();

    const { status, body } = await getJSON(route, "/domains/kastro/trends?days=500", cookie);
    assert.equal(status, 200);
    assert.equal(body.domain, "kastro.is");
    assert.equal(body.days, 90);
    assert.ok(body.score_points.length >= 2);
    assert.ok(body.alignment_points.length >= 2);
    assert.ok(body.score_points.every((point) => typeof point.score === "number" && point.date));
  });
});

test("mock proxy serves SPF route history with whitelisted metadata", async () => {
  await withEnv(mockEnv(), async () => {
    const route = loadTSModule(ROUTE);
    const { status, body } = await getJSON(route, "/domains/kastro/spf-route/history", sessionCookie());
    assert.equal(status, 200);
    assert.equal(body.route_id, "mock-spf-route-kastro");
    assert.ok(body.events.length >= 1);
    const raw = JSON.stringify(body);
    assert.equal(raw.includes("remote_addr"), false);
    assert.equal(raw.includes("BUNNY"), false);
  });
});

test("mock proxy serves plan limits", async () => {
  await withEnv(mockEnv(), async () => {
    const route = loadTSModule(ROUTE);
    const { status, body } = await getJSON(route, "/plan", sessionCookie());
    assert.equal(status, 200);
    assert.equal(body.plan, "monitor");
    assert.equal(body.saved_domains_limit, 10);
    assert.equal(typeof body.saved_domains_used, "number");
  });
});

test("mock proxy change-plan exposes journey readiness fields", async () => {
  await withEnv(mockEnv(), async () => {
    const route = loadTSModule(ROUTE);
    const { status, body } = await getJSON(route, "/domains/kastro/change-plan", sessionCookie());
    assert.equal(status, 200);
    assert.equal(typeof body.journey_ready_for_next, "boolean");
    assert.ok(Array.isArray(body.journey_blocking_signals));
    assert.ok(body.journey_reason);
    assert.ok(body.policy);
  });
});

test("mock proxy still serves every legacy dashboard read path", async () => {
  await withEnv(mockEnv(), async () => {
    const route = loadTSModule(ROUTE);
    const cookie = sessionCookie();
    for (const path of [
      "",
      "/domains",
      "/domains/kastro",
      "/domains/kastro/dns-guidance",
      "/domains/kastro/spf-route",
      "/domains/kastro/brand-risk",
      "/domains/kastro/reporter",
      "/alerts",
      "/settings",
    ]) {
      const { status } = await getJSON(route, path, cookie);
      assert.equal(status, 200, `GET ${path || "/"}`);
    }
  });
});
