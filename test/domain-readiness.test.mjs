import test from "node:test";
import assert from "node:assert/strict";
import { loadTSModule } from "./load-ts.mjs";
const { domainReadiness, parseScoreCache } = loadTSModule(
  "lib/domain-readiness.ts",
);
const fixture = () => ({
  domain: "example.com",
  source: "live",
  checkedAt: new Date().toISOString(),
  spf: { valid: true, lookups: 2, record: "v=spf1 -all" },
  dmarc: { valid: true, policy: "reject", record: "v=DMARC1; p=reject" },
  assessment: {
    incomplete: false,
    pct: 100,
    spfState: "green",
    dmarcState: "green",
    dkimState: "green",
  },
});
test("100 requires all five observed checks; optional BIMI and manual notes do not affect it", () => {
  const result = fixture();
  result.completed = ["spf", "dkim"];
  result.authentication = { bimi: { state: "missing" } };
  assert.equal(domainReadiness(result).score, 100);
  result.authentication.dkim = {
    state: "missing",
    name: "custom._domainkey.example.com",
  };
  assert.equal(domainReadiness(result).score, 80);
  assert.equal(domainReadiness(result).next.id, "dkim");
});
test("incomplete and demo scans never receive a readiness score", () => {
  const result = fixture();
  result.assessment.incomplete = true;
  assert.equal(domainReadiness(result).score, null);
  result.assessment.incomplete = false;
  result.source = "demo";
  assert.equal(domainReadiness(result).score, null);
});
test("partial policy, lookup pressure and invalid records select actionable guidance", () => {
  const result = fixture();
  result.spf.lookups = 9;
  result.dmarc.policy = "quarantine";
  assert.equal(domainReadiness(result).score, 60);
  assert.equal(domainReadiness(result).next.id, "spf-health");
  result.spf.valid = false;
  assert.equal(domainReadiness(result).next.id, "spf-valid");
  result.spf.valid = true;
  result.spf.lookups = 2;
  result.assessment.pct = 50;
  result.dmarc.policy = "reject";
  assert.equal(domainReadiness(result).score, 80);
  assert.match(
    domainReadiness(result).next.action,
    /Before increasing enforcement/,
  );
});
test("cached scores are bounded, versioned and expire; impossible and future scores are ignored", () => {
  const now = Date.now();
  const entry = {
    score: 100,
    grade: "A",
    selector: "",
    checkedAt: new Date(now).toISOString(),
  };
  const raw = JSON.stringify({
    v: 1,
    scores: [
      ["example.com", entry],
      ["bad.com", { ...entry, score: 99 }],
      [
        "old.com",
        { ...entry, checkedAt: new Date(now - 8 * 86400000).toISOString() },
      ],
      [
        "future.com",
        { ...entry, checkedAt: new Date(now + 120000).toISOString() },
      ],
    ],
  });
  assert.deepEqual(Object.keys(parseScoreCache(raw, now)), ["example.com"]);
  assert.equal(Object.keys(parseScoreCache("bad")).length, 0);
});
