import test from "node:test";
import assert from "node:assert/strict";
import { loadTSModule } from "./load-ts.mjs";

const setup = loadTSModule("lib/mail-setup.ts");
const { mapMailRouting } = loadTSModule("lib/live-scan.ts");
const plain = (value) => JSON.parse(JSON.stringify(value));

function scan(overrides = {}) {
  return {
    domain: "example.is",
    source: "live",
    status: "FAIL",
    spoofable: true,
    spf: { valid: false, lookups: 0, record: "" },
    dmarc: { valid: false, policy: "unknown", record: "" },
    assessment: { incomplete: false, pct: 100, spfReason: "", dmarcReason: "", dkimState: "red", dkimReason: "", warnings: [] },
    mail: { mx: ["example-is.mail.protection.outlook.com"], ns: ["ns1.isnic.is"], mxKnown: true, nsKnown: true },
    ...overrides,
  };
}

test("a bare Microsoft 365 domain gets exact SPF and DMARC records and starts at SPF", () => {
  const plan = setup.buildMailPlan(scan());
  assert.equal(plan.provider, "microsoft");
  assert.equal(plan.verdict, "exposed");
  assert.match(plan.headline, /Hver sem er getur sent póst í nafni example\.is/);
  assert.deepEqual(plain(plan.steps.map((s) => [s.id, s.status])), [["spf", "now"], ["dkim", "later"], ["dmarc", "later"], ["quarantine", "later"], ["reject", "later"]]);
  assert.equal(plan.steps[0].records[0].value, "v=spf1 include:spf.protection.outlook.com -all");
  assert.equal(plan.steps[0].records[0].host, "@");
  assert.deepEqual(plain(plan.steps[1].records.map((r) => [r.type, r.host, r.fromProvider])), [["CNAME", "selector1._domainkey", true], ["CNAME", "selector2._domainkey", true]]);
  assert.equal(plan.steps[2].records[0].fqdn, "_dmarc.example.is");
  assert.equal(plan.steps[2].records[0].value, "v=DMARC1; p=none;");
  assert.equal(plan.dnsHost.name, "ISNIC");
});

test("Google is detected from MX and keeps other senders when merging SPF", () => {
  const plan = setup.buildMailPlan(scan({
    mail: { mx: ["aspmx.l.google.com", "alt1.aspmx.l.google.com"], ns: ["kai.ns.cloudflare.com"], mxKnown: true, nsKnown: true },
    spf: { valid: true, lookups: 1, record: "v=spf1 include:servers.mcsv.net ?all" },
  }), "en");
  assert.equal(plan.provider, "google");
  assert.equal(plan.steps[0].status, "now");
  assert.equal(plan.steps[0].records[0].value, "v=spf1 include:servers.mcsv.net include:_spf.google.com ~all");
  assert.equal(plan.steps[0].replaces, true);
  assert.equal(plan.steps[1].records[0].host, "google._domainkey");
  assert.equal(plan.dnsHost.name, "Cloudflare");
  assert.match(plan.steps[0].links[0].url, /cloudflare/);
});

test("p=none with working SPF and DKIM points at quarantine and keeps reporting tags", () => {
  const plan = setup.buildMailPlan(scan({
    spf: { valid: true, lookups: 1, record: "v=spf1 include:spf.protection.outlook.com -all" },
    dmarc: { valid: true, policy: "none", record: "v=DMARC1; p=none; pct=50; rua=mailto:d@example.is" },
    assessment: { incomplete: false, pct: 50, spfReason: "", dmarcReason: "", dkimState: "green", dkimReason: "", warnings: [] },
  }));
  assert.equal(plan.verdict, "exposed");
  assert.deepEqual(plain(plan.steps.map((s) => s.status)), ["done", "done", "done", "now", "later"]);
  assert.equal(plan.steps[3].records[0].value, "v=DMARC1; p=quarantine; rua=mailto:d@example.is;");
  assert.equal(plan.steps[4].records[0].value, "v=DMARC1; p=reject; rua=mailto:d@example.is;");
  assert.equal(plan.done, 3);
});

test("full enforcement is protected; quarantine is almost", () => {
  const base = {
    spf: { valid: true, lookups: 1, record: "v=spf1 include:spf.protection.outlook.com -all" },
    assessment: { incomplete: false, pct: 100, spfReason: "", dmarcReason: "", dkimState: "green", dkimReason: "", warnings: [] },
  };
  const reject = setup.buildMailPlan(scan({ ...base, dmarc: { valid: true, policy: "reject", record: "v=DMARC1; p=reject" } }));
  assert.equal(reject.verdict, "protected");
  assert.equal(reject.done, reject.total);
  const quarantine = setup.buildMailPlan(scan({ ...base, dmarc: { valid: true, policy: "quarantine", record: "v=DMARC1; p=quarantine" } }));
  assert.equal(quarantine.verdict, "almost");
  assert.equal(quarantine.steps.find((s) => s.status === "now").id, "reject");
});

test("a domain with no MX and no senders gets a single lockdown step", () => {
  const plan = setup.buildMailPlan(scan({ mail: { mx: [], ns: [], mxKnown: true, nsKnown: false } }));
  assert.equal(plan.provider, "none");
  assert.deepEqual(plain(plan.steps.map((s) => s.id)), ["lockdown"]);
  assert.deepEqual(plain(plan.steps[0].records.map((r) => r.value)), ["v=spf1 -all", "v=DMARC1; p=reject;"]);
  assert.equal(plan.dnsHost, null);
});

test("a failed MX lookup never triggers the lockdown advice", () => {
  const plan = setup.buildMailPlan(scan({ mail: { mx: [], ns: [], mxKnown: false, nsKnown: false } }));
  assert.equal(plan.provider, "other");
  assert.equal(plan.steps[0].records.length, 0);
  assert.equal(plan.steps[2].records[0].value, "v=DMARC1; p=none;");
});

test("incomplete scans give an unknown verdict", () => {
  const plan = setup.buildMailPlan(scan({ assessment: { incomplete: true, pct: 100, spfReason: "", dmarcReason: "", dkimState: "red", dkimReason: "", warnings: [] } }));
  assert.equal(plan.verdict, "unknown");
});

test("SPF merge refuses redirect records and drops permissive all terms", () => {
  assert.equal(setup.mergeSpf("v=spf1 redirect=_spf.example.net", "_spf.google.com", "~all"), null);
  assert.equal(setup.mergeSpf("v=spf1 a mx +all", "_spf.google.com", "~all"), "v=spf1 a mx include:_spf.google.com ~all");
  assert.equal(setup.mergeSpf("v=spf1 include:_spf.google.com  -all", "_spf.google.com", "~all"), "v=spf1 include:_spf.google.com -all");
});

test("the IT message lists records for the remaining setup steps only", () => {
  const plan = setup.buildMailPlan(scan(), "en");
  const message = setup.itMessage(plan, "en");
  assert.match(message, /TXT {2}example\.is {2}"v=spf1 include:spf\.protection\.outlook\.com -all"/);
  assert.match(message, /CNAME {2}selector1\._domainkey\.example\.is/);
  assert.match(message, /TXT {2}_dmarc\.example\.is {2}"v=DMARC1; p=none;"/);
  assert.doesNotMatch(message, /p=reject;"/);
});

test("mail routing keeps valid hosts ordered by MX priority and flags failed lookups", () => {
  const routing = mapMailRouting({
    mx: [{ exchange: "ALT1.ASPMX.L.GOOGLE.COM.", priority: 5 }, { exchange: "aspmx.l.google.com", priority: 1 }, { exchange: "bad host", priority: 0 }],
    ns: ["b.ns.example", "a.ns.example"],
    recordErrors: { NS: "timeout" },
  });
  assert.deepEqual(plain(routing), { mx: ["aspmx.l.google.com", "alt1.aspmx.l.google.com"], ns: ["a.ns.example", "b.ns.example"], mxKnown: true, nsKnown: false });
  assert.deepEqual(plain(mapMailRouting(undefined)), { mx: [], ns: [], mxKnown: false, nsKnown: false });
});
