import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { loadTSModule, root } from "./load-ts.mjs";

function filesBelow(directory) {
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name));
}

test("Next exports a static site with no route handlers", () => {
  const config = readFileSync(join(root, "next.config.mjs"), "utf8");
  const appFiles = filesBelow(join(root, "app"));

  assert.match(config, /output:\s*["']export["']/);
  assert.equal(appFiles.some((path) => path.endsWith("route.ts")), false);
});

test("marketing interactions do not call a backend", () => {
  const source = readFileSync(join(root, "components/dmark-marketing.tsx"), "utf8");

  assert.doesNotMatch(source, /fetch\s*\(/);
  assert.doesNotMatch(source, /\/api\//);
  assert.match(source, /mockScan\(validation\.domain\)/);
  assert.match(source, /kastro\.is\/\$\{locale\}\/services\/dmark/);
});

test("the browser demo is deterministic in posture and clearly labelled", () => {
  const scan = loadTSModule("lib/scan.ts");
  const exposed = scan.mockScan("example.is");
  const protectedDomain = scan.mockScan("kastro.is");
  const evidence = scan.buildScanEvidenceSummary(exposed);

  assert.equal(exposed.source, "demo");
  assert.equal(exposed.status, "FAIL");
  assert.equal(protectedDomain.status, "PASS");
  assert.equal(evidence.sourceLabel, "Illustrative browser demo");
  assert.match(evidence.detail, /not based on a live DNS lookup/i);
});

test("domain examples are normalised and validated locally", () => {
  const scan = loadTSModule("lib/scan.ts");

  assert.equal(scan.validateScannableDomain(" https://www.KASTRO.is/mail ").domain, "kastro.is");
  assert.match(scan.validateScannableDomain("andri@kastro.is").error, /domain only/i);
  assert.match(scan.validateScannableDomain("kastro").error, /full domain/i);
});

test("privacy events accept only the static demo source", () => {
  const events = loadTSModule("lib/privacy-events.ts");

  assert.deepEqual({ ...events.sanitizePrivacyEventProperties({ status: "PASS", source: "demo_scanner" }) }, {
    status: "PASS",
    source: "demo_scanner",
  });
  assert.equal(events.sanitizePrivacyEventProperties({ source: "public_scanner" }), null);
});
