import assert from "node:assert/strict";
import test from "node:test";
import { loadTSModule } from "./load-ts.mjs";
function proxy(fetch) {
  return loadTSModule("lib/account-proxy.ts", { fetch }).proxyAccount;
}
const url = "https://dmark.is/api/account/workspace/";
test("account proxy isolates the session cookie and pins the backend origin", async () => {
  let forwarded;
  const call = proxy(async (url, options) => {
    forwarded = { url: String(url), options };
    return Response.json(
      { version: 1, domains: [] },
      {
        headers: {
          "Set-Cookie":
            "session=abcdefghijklmnopqrstuvwxyz012345; Path=/; HttpOnly",
        },
      },
    );
  });
  const result = await call(
    new Request(url, {
      method: "POST",
      headers: {
        origin: "https://dmark.is",
        cookie: "unrelated=secret; dmark_account=abcdefghijklmnop0123456789",
        "X-CSRF-Token": "csrf",
      },
      body: '{"domains":[],"version":0}',
    }),
    "workspace",
  );
  assert.equal(result.status, 200);
  assert.equal(forwarded.url, "https://dmark.kastro.is/api/account/workspace");
  assert.equal(
    forwarded.options.headers.Cookie,
    "session=abcdefghijklmnop0123456789",
  );
  assert.equal(forwarded.options.headers.Origin, "https://dmark.is");
  assert.equal(forwarded.options.headers["X-CSRF-Token"], "csrf");
  assert.match(
    result.headers.get("set-cookie"),
    /dmark_account=.*HttpOnly; SameSite=Lax.*Secure/,
  );
});
test("cross-origin writes and oversized bodies never reach the account backend", async () => {
  let calls = 0;
  const call = proxy(async () => {
    calls++;
    return Response.json({});
  });
  for (const origin of ["https://evil.example", "null"])
    assert.equal(
      (
        await call(
          new Request(url, { method: "POST", headers: { origin }, body: "{}" }),
          "workspace",
        )
      ).status,
      403,
    );
  assert.equal(
    (
      await call(
        new Request(url, {
          method: "POST",
          headers: { origin: "https://dmark.is" },
          body: "x".repeat(16001),
        }),
        "workspace",
      )
    ).status,
    413,
  );
  assert.equal(calls, 0);
});
test("upstream failure and logout cannot leave a false account success", async () => {
  assert.equal(
    (
      await proxy(async () => {
        throw Error("offline");
      })(new Request(url), "me")
    ).status,
    503,
  );
  const result = await proxy(async () =>
    Response.json(
      { authenticated: false },
      { headers: { "Set-Cookie": "session=; Max-Age=0" } },
    ),
  )(
    new Request(url, {
      method: "POST",
      headers: { origin: "https://dmark.is" },
    }),
    "logout",
  );
  assert.match(result.headers.get("set-cookie"), /dmark_account=;.*Max-Age=0/);
});
