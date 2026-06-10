import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadTSModule, root } from "./load-ts.mjs";

const SESSION_ENV = "DMARK_DASHBOARD_AUTHENTIK_SESSION_SECRET";
const EMAILS_ENV = "DMARK_DASHBOARD_AUTHENTIK_ALLOWED_EMAILS";
const GROUPS_ENV = "DMARK_DASHBOARD_AUTHENTIK_ALLOWED_GROUPS";

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

test("dashboard session cookie round-trips and rejects tampering", () => {
  withEnv({ [SESSION_ENV]: "test-secret-with-enough-entropy" }, () => {
    const access = loadTSModule("lib/dashboard-authentik-access.ts");
    const cookie = access.signDashboardAuthentikSession({ email: "Customer@Example.is", name: "Customer", groups: ["dmark-customers"] });
    assert.ok(cookie.includes("."));

    const session = access.verifyDashboardAuthentikSession(cookie);
    assert.equal(session.email, "customer@example.is");
    assert.deepEqual(JSON.parse(JSON.stringify(session.groups)), ["dmark-customers"]);

    const [payload, signature] = cookie.split(".");
    const tamperedPayload = Buffer.from(JSON.stringify({ email: "attacker@example.is", exp: session.exp }))
      .toString("base64url");
    assert.equal(access.verifyDashboardAuthentikSession(`${tamperedPayload}.${signature}`), null);
    assert.equal(access.verifyDashboardAuthentikSession(`${payload}.${signature}x`), null);
    assert.equal(access.verifyDashboardAuthentikSession(`${payload}.${signature}.extra`), null);
    assert.equal(access.verifyDashboardAuthentikSession(""), null);
  });
});

test("dashboard session cookie expires after its TTL", () => {
  withEnv({ [SESSION_ENV]: "test-secret-with-enough-entropy" }, () => {
    const access = loadTSModule("lib/dashboard-authentik-access.ts");
    const now = Math.floor(Date.now() / 1000);
    const cookie = access.signDashboardAuthentikSession({ email: "customer@example.is" }, now + 60);

    assert.ok(access.verifyDashboardAuthentikSession(cookie, now));
    assert.equal(access.verifyDashboardAuthentikSession(cookie, now + 61), null);
  });
});

test("dashboard state cookie verification is signed and exact", () => {
  withEnv({ [SESSION_ENV]: "test-secret-with-enough-entropy" }, () => {
    const access = loadTSModule("lib/dashboard-authentik-access.ts");
    const cookie = access.signDashboardAuthentikState("state-value");

    assert.ok(access.verifyDashboardAuthentikState(cookie, "state-value"));
    assert.equal(access.verifyDashboardAuthentikState(cookie, "other-state"), false);
    assert.equal(access.verifyDashboardAuthentikState(`${cookie}x`, "state-value"), false);
    assert.equal(access.verifyDashboardAuthentikState("", "state-value"), false);
  });
});

test("dashboard nonce helpers bind the login to the id_token nonce claim", () => {
  withEnv({ [SESSION_ENV]: "test-secret-with-enough-entropy" }, () => {
    const access = loadTSModule("lib/dashboard-authentik-access.ts");
    const cookie = access.signDashboardAuthentikNonce("nonce-value");

    const claims = Buffer.from(JSON.stringify({ sub: "user", nonce: "nonce-value" })).toString("base64url");
    const header = Buffer.from(JSON.stringify({ alg: "RS256" })).toString("base64url");
    const idToken = `${header}.${claims}.signature`;

    assert.equal(access.decodeIDTokenNonce(idToken), "nonce-value");
    assert.ok(access.verifyDashboardAuthentikNonce(cookie, access.decodeIDTokenNonce(idToken)));
    assert.equal(access.verifyDashboardAuthentikNonce(cookie, "different-nonce"), false);
    assert.equal(access.verifyDashboardAuthentikNonce(cookie, ""), false);
    assert.equal(access.decodeIDTokenNonce("not-a-jwt"), "");
    assert.equal(access.decodeIDTokenNonce(`${header}.${Buffer.from("junk").toString("base64url")}.sig`), "");
  });
});

test("dashboard allowed-user checks fail closed without allowlists", () => {
  withEnv({ [EMAILS_ENV]: undefined, [GROUPS_ENV]: undefined }, () => {
    const access = loadTSModule("lib/dashboard-authentik-access.ts");
    assert.equal(access.isDashboardAuthentikUserAllowed({ email: "anyone@example.is" }), false);
  });

  withEnv({ [EMAILS_ENV]: "customer@example.is", [GROUPS_ENV]: "dmark-customers" }, () => {
    const access = loadTSModule("lib/dashboard-authentik-access.ts");
    assert.ok(access.isDashboardAuthentikUserAllowed({ email: "Customer@Example.is" }));
    assert.ok(access.isDashboardAuthentikUserAllowed({ email: "other@example.is", groups: ["DMARK-Customers"] }));
    assert.equal(access.isDashboardAuthentikUserAllowed({ email: "other@example.is", groups: ["strangers"] }), false);
  });
});

test("auth callbacks verify the nonce and never log tokens", () => {
  for (const file of ["app/api/dashboard/auth/callback/route.ts", "app/api/auth/callback/route.ts"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, /nonceCookie/, `${file} reads the nonce cookie`);
    assert.match(source, /id_token/, `${file} uses the id_token`);
    assert.match(source, /authentik-failed/, `${file} fails closed`);
    assert.doesNotMatch(source, /console\.log/, `${file} must not log`);
  }
  for (const file of ["app/api/dashboard/auth/login/route.ts", "app/api/auth/login/route.ts"]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, /NonceCookieName|nonceCookieName/i, `${file} sets the nonce cookie`);
    assert.match(source, /httpOnly: true/, `${file} keeps cookies httpOnly`);
  }
});
