#!/usr/bin/env node

const baseURL = normalizeBaseURL(process.argv[2] || "https://dmark.is");
const failures = [];

await check("dashboard page shows customer login UI", async () => {
  const response = await fetchURL("/dashboard");
  assertStatus(response, 200, "GET /dashboard");
  const body = await response.text();
  assertIncludes(body, "Sign in", "dashboard page should contain sign-in copy");
  assertIncludes(body, "/api/dashboard/auth/login", "dashboard page should link to customer dashboard login");
  assertNotIncludes(body, "/api/auth/login", "dashboard page must not point at admin login");
});

await check("dashboard API rejects unauthenticated access", async () => {
  const response = await fetchURL("/api/dashboard");
  if (![401, 403].includes(response.status)) {
    throw new Error(`GET /api/dashboard expected 401 or 403, got ${response.status}`);
  }
});

await check("dashboard login redirects to customer Authentik provider", async () => {
  const response = await fetchURL("/api/dashboard/auth/login", { redirect: "manual" });
  assertRedirect(response, "dashboard login");
  const location = response.headers.get("location") || "";
  const parsed = new URL(location);
  assertIncludes(parsed.hostname, "auth.kastro.is", "dashboard login should redirect to Authentik");
  assertEqual(parsed.searchParams.get("client_id"), "dmark-dashboard", "dashboard login client_id");
  assertEqual(
    parsed.searchParams.get("redirect_uri"),
    `${baseURL.origin}/api/dashboard/auth/callback`,
    "dashboard login callback",
  );
  const cookieSummary = summarizeSetCookie(response.headers.get("set-cookie") || "");
  assertIncludes(cookieSummary, "dmark_dashboard_authentik_state", "dashboard login should set state cookie name");
  assertIncludes(cookieSummary, "Path=/api/dashboard/auth/callback", "dashboard state cookie should be callback-scoped");
  assertIncludes(cookieSummary, "HttpOnly", "dashboard state cookie should be HttpOnly");
});

await check("public scanner remains unauthenticated", async () => {
  const response = await fetchURL("/api/scan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ domain: "kastro.is" }),
  });
  assertStatus(response, 200, "POST /api/scan");
  const payload = await response.json();
  assertIncludes(JSON.stringify(payload), "kastro.is", "public scanner should return scan data for safe public domain");
});

await check("admin login remains on separate Authentik provider", async () => {
  const response = await fetchURL("/api/auth/login", { redirect: "manual" });
  assertRedirect(response, "admin login");
  const location = response.headers.get("location") || "";
  const parsed = new URL(location);
  const adminClient = parsed.searchParams.get("client_id") || "";
  assertNotEqual(adminClient, "dmark-dashboard", "admin login must not use customer client_id");
  assertEqual(parsed.searchParams.get("redirect_uri"), `${baseURL.origin}/api/auth/callback`, "admin login callback");
});

if (failures.length > 0) {
  console.error(`\n${failures.length} dashboard auth smoke check(s) failed.`);
  process.exitCode = 1;
}

async function check(label, fn) {
  try {
    await fn();
    console.log(`PASS ${label}`);
  } catch (error) {
    failures.push(label);
    console.error(`FAIL ${label}: ${redact(String(error && error.message ? error.message : error))}`);
  }
}

function normalizeBaseURL(value) {
  const url = new URL(value);
  url.pathname = "";
  url.search = "";
  url.hash = "";
  return url;
}

function fetchURL(path, options = {}) {
  return fetch(new URL(path, baseURL), { redirect: "manual", ...options });
}

function assertStatus(response, expected, label) {
  if (response.status !== expected) {
    throw new Error(`${label} expected ${expected}, got ${response.status}`);
  }
}

function assertRedirect(response, label) {
  if (![302, 303, 307, 308].includes(response.status)) {
    throw new Error(`${label} expected redirect, got ${response.status}`);
  }
  if (!response.headers.get("location")) {
    throw new Error(`${label} missing Location header`);
  }
}

function assertIncludes(value, needle, label) {
  if (!String(value).includes(needle)) {
    throw new Error(`${label}: missing ${needle}`);
  }
}

function assertNotIncludes(value, needle, label) {
  if (String(value).includes(needle)) {
    throw new Error(`${label}: unexpectedly contained ${needle}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, got ${actual}`);
  }
}

function assertNotEqual(actual, forbidden, label) {
  if (actual === forbidden) {
    throw new Error(`${label}: got forbidden ${forbidden}`);
  }
}

function summarizeSetCookie(value) {
  if (!value) return "";
  return value
    .split(/,(?=\s*[^;,=]+=[^;,]+)/)
    .map((cookie) => {
      const parts = cookie.split(";").map((part) => part.trim()).filter(Boolean);
      const name = (parts.shift() || "").split("=")[0];
      return [name, ...parts].join("; ");
    })
    .join(" | ");
}

function redact(value) {
  return value
    .replace(/([?&](?:state|nonce|code)=)[^&\s]+/gi, "$1[REDACTED]")
    .replace(/(authentik_state=)[^;\s]+/gi, "$1[REDACTED]")
    .replace(/(cookie:?)\s*[^\n]+/gi, "$1 [REDACTED]");
}
