import assert from "node:assert/strict";
import test from "node:test";
import { isIP } from "node:net";
import { loadTSModule } from "./load-ts.mjs";
const scan = loadTSModule("lib/scan.ts");
const flatten = loadTSModule("lib/spf-flatten.ts", { "node:net": { isIP } });
const dns = (records) => (name) => {
  if (!(name in records)) throw Error("NXDOMAIN");
  return Promise.resolve(records[name].map((record) => [record]));
};
test("nested include expansion preserves top-level policy, CIDRs and provenance without widening", async () => {
  const r = await flatten.flattenSpf(
    "example.com",
    dns({
      "example.com": ["v=spf1 include:_spf.vendor.com ip4:198.51.100.2 ~all"],
      "_spf.vendor.com": [
        "v=spf1 +include:child.vendor.com ip6:2001:db8::/48 -all",
      ],
      "child.vendor.com": ["v=spf1 ip4:192.0.2.0/24 -all"],
    }),
  );
  assert.equal(
    r.flattened,
    "v=spf1 ip4:192.0.2.0/24 ip4:198.51.100.2 ip6:2001:db8::/48 ~all",
  );
  assert.equal(r.dependencies, 2);
  assert.equal(r.lookupTerms, 2);
  assert.equal(
    r.sources.find((s) => s.network === "ip4:192.0.2.0/24").domain,
    "child.vendor.com",
  );
});
test("redirect policy and include non-pass results are handled differently", async () => {
  const result = await flatten.flattenSpf(
    "example.com",
    dns({
      "example.com": [
        "v=spf1 include:empty.vendor.com redirect=_spf.vendor.com",
      ],
      "empty.vendor.com": ["v=spf1 -all"],
      "_spf.vendor.com": ["v=spf1 ip4:192.0.2.1 ?all"],
    }),
  );
  assert.equal(result.flattened, "v=spf1 ip4:192.0.2.1 ?all");
  assert.equal(result.lookupTerms, 2);
});
test("loops, unsupported order/qualifiers/macros/modifiers and bad networks never produce a candidate", async () => {
  for (const term of [
    "-ip4:192.0.2.1",
    "~include:other.com",
    "?ip6:2001:db8::",
    "+all",
    "a",
    "mx",
    "exists:other.com",
    "ptr",
    "include:%{i}.other.com",
    "exp=other.com",
    "ip4:192.0.2.1/33",
    "ip6:2001:db8::/129",
    "ip4:999.1.1.1",
  ]) {
    await assert.rejects(
      flatten.flattenSpf(
        "example.com",
        dns({ "example.com": [`v=spf1 ${term} -all`] }),
      ),
    );
  }
  await assert.rejects(
    flatten.flattenSpf(
      "example.com",
      dns({ "example.com": ["v=spf1 -all ip4:192.0.2.1"] }),
    ),
  );
  await assert.rejects(
    flatten.flattenSpf(
      "example.com",
      dns({
        "example.com": ["v=spf1 include:loop.com -all"],
        "loop.com": ["v=spf1 redirect=example.com"],
      }),
    ),
    (e) => e.code === "LOOP",
  );
});
test("missing/duplicate records, lookup failures and oversized output cannot return partial success", async () => {
  for (const values of [[], ["v=spf1 -all", "v=spf1 ~all"]])
    await assert.rejects(
      flatten.flattenSpf("example.com", dns({ "example.com": values })),
    );
  await assert.rejects(
    flatten.flattenSpf(
      "example.com",
      dns({ "example.com": ["v=spf1 ip4:192.0.2.1 include:missing.com -all"] }),
    ),
    (e) => e.code === "DNS_FAILED",
  );
  const ips = Array.from({ length: 35 }, (_, i) => `ip4:192.0.2.${i}`).join(
    " ",
  );
  await assert.rejects(
    flatten.flattenSpf(
      "example.com",
      dns({ "example.com": [`v=spf1 ${ips} -all`] }),
    ),
    (e) => e.code === "OUTPUT_TOO_LARGE",
  );
});
test("split TXT strings and repeated dependencies work; large include counts can be removed", async () => {
  let queries = 0;
  const r = await flatten.flattenSpf("example.com", async (name) => {
    queries++;
    return name === "example.com"
      ? [
          [
            "v=spf1 ",
            ...Array.from({ length: 11 }, () => "include:vendor.com "),
            "~all",
          ],
        ]
      : [["v=spf1 ip4:192.0.2.1 -all"]];
  });
  assert.equal(r.lookupTerms, 11);
  assert.equal(queries, 2);
  assert.equal(r.flattened, "v=spf1 ip4:192.0.2.1 ~all");
  const value = r.zoneValue
    .match(/"([^"]*)"/g)
    .map((chunk) => chunk.slice(1, -1))
    .join("");
  assert.equal(value, r.flattened);
});
test("DNS recursion and target validation are bounded", async () => {
  let queries = 0;
  await assert.rejects(
    flatten.flattenSpf("example.com", async () => {
      queries++;
      return [[`v=spf1 include:level${queries}.vendor.com -all`]];
    }),
    (e) => e.code === "LIMIT",
  );
  assert.equal(queries, 12);
  for (const target of [
    "localhost",
    "service.local",
    "127.0.0.1",
    "https://example.com",
  ])
    await assert.rejects(flatten.flattenSpf(target, dns({})));
});
test("flatten route rejects invalid bodies and foreign origins before DNS work and never emits a partial result", async () => {
  let called = 0;
  const route = loadTSModule("app/api/spf/flatten/route.ts", {
    "@/lib/scan": scan,
    "@/lib/spf-flatten": flatten,
    "@/lib/spf-flatten-dns": {
      generateFlattenedSpf: async (domain) => {
        called++;
        if (domain === "broken.com")
          throw new flatten.FlattenError("UNSUPPORTED_TERM", domain, "mx");
        return { domain, flattened: "v=spf1 -all" };
      },
    },
  });
  const req = (body, origin = "https://dmark.is") =>
    new Request("https://dmark.is/api/spf/flatten/", {
      method: "POST",
      headers: { origin, "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal(
    (await route.POST(req({ domain: "example.com" }, "https://elsewhere.com")))
      .status,
    403,
  );
  assert.equal((await route.POST(req({ domain: "127.0.0.1" }))).status, 400);
  assert.equal(
    (await route.POST(req({ domain: "x".repeat(2000) }))).status,
    400,
  );
  assert.equal(called, 0);
  const good = await route.POST(req({ domain: "example.com" }));
  assert.equal(good.status, 200);
  assert.equal(good.headers.get("cache-control"), "no-store");
  const bad = await route.POST(req({ domain: "broken.com" }));
  assert.equal(bad.status, 422);
  const payload = await bad.json();
  assert.equal(payload.code, "UNSUPPORTED_TERM");
  assert.equal(payload.flattened, undefined);
});
