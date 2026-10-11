import { readFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const axeScript = require.resolve("axe-core/axe.min.js");
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const server = spawn(
  "node",
  ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
);
await new Promise((resolve, reject) => {
  server.stdout.on("data", (data) => {
    if (data.toString().includes("Ready")) resolve();
  });
  server.on("exit", (code) => reject(Error("server exit " + code)));
  server.stderr.on("data", (data) => console.error(data.toString()));
});
process.on("exit", () => server.kill());
const browser = await chromium.launch({
  ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
    : {}),
  headless: true,
  args: ["--no-sandbox"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.route("**/api/account/**", (r) =>
  r.fulfill({
    status: 200,
    json: { authenticated: false, available: false, csrf: "x".repeat(43) },
  }),
);
async function checkAccessibility(label) {
  await page.addScriptTag({ path: axeScript });
  const findings = await page.evaluate(async () => {
    const result = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] } });
    return result.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
  });
  if (findings.length) throw Error(`Accessibility ${label}: ${JSON.stringify(findings)}`);
}
async function noOverflow(label) {
  const sizes = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }));
  if (sizes.scroll > sizes.width) throw Error(`Overflow ${label}: ${JSON.stringify(sizes)}`);
}
let improved = false;
await page.route("**/api/scan/**", (route) =>
  route.fulfill({
    json: {
      domain: route.request().postDataJSON().domain,
      source: "live",
      checkedAt: new Date().toISOString(),
      status: improved ? "PASS" : "FAIL",
      audit: { grade: improved ? "A" : "F" },
      spf: { valid: true, lookups: 2, record: "v=spf1 -all" },
      dmarc: {
        valid: true,
        policy: improved ? "reject" : "none",
        record: improved ? "v=DMARC1; p=reject" : "v=DMARC1; p=none",
      },
      assessment: {
        incomplete: false,
        spfState: "green",
        dmarcState: improved ? "green" : "red",
        dkimState: improved ? "green" : "red",
        pct: 100,
        spfReason: "",
        dmarcReason: "",
        dkimReason: "",
        warnings: [],
      },
      authentication: {
        bimi: {
          state: "missing",
          record: "",
          name: "default._bimi.example.com",
        },
      },
    },
  }),
);
let flattenFailure = false;
await context.grantPermissions(["clipboard-read", "clipboard-write"]);
await page.route("**/api/spf/flatten/**", (route) => {
  if (flattenFailure)
    return route.fulfill({
      status: 422,
      json: { code: "UNSUPPORTED_TERM", target: "example.com", term: "mx" },
    });
  return route.fulfill({
    json: {
      domain: "example.com",
      original: "v=spf1 include:vendor.com ~all",
      flattened: "v=spf1 ip4:192.0.2.1 ~all",
      generatedAt: new Date().toISOString(),
      dependencies: 1,
      lookupTerms: 1,
      zoneValue: '"v=spf1 ip4:192.0.2.1 ~all"',
      sources: [
        {
          network: "ip4:192.0.2.1",
          domain: "vendor.com",
          mechanism: "ip4:192.0.2.1",
        },
      ],
    },
  });
});
await page.goto("http://localhost:3000/en/");
await page.getByRole("button", { name: "Add domain", exact: true }).waitFor();
await checkAccessibility("English empty workspace");
await page.locator("#add-domain").fill("not-a-domain");
await page.getByRole("button", { name: "Add domain", exact: true }).click();
await page.locator("#add-domain-error").waitFor();
if (await page.locator("#add-domain").getAttribute("aria-invalid") !== "true") throw Error("Missing input invalid state");
if (await page.evaluate(() => document.activeElement?.id) !== "add-domain") throw Error("Invalid input did not receive focus");
await checkAccessibility("Domain validation error");
await page.locator("#add-domain").fill("example.com");
await page.getByRole("button", { name: "Add domain", exact: true }).click();

await page.locator(".scan-grade > strong").filter({ hasText: "60" }).waitFor();
await checkAccessibility("Domain summary");
const summaryTab = page.getByRole("tab").first();
await summaryTab.focus();
await page.keyboard.press("End");
if (await page.getByRole("tab").last().getAttribute("aria-selected") !== "true") throw Error("End key did not select last tab");
await page.keyboard.press("Home");
if (await summaryTab.getAttribute("aria-selected") !== "true") throw Error("Home key did not select first tab");
for (const control of await page.getByRole("tab").evaluateAll(items => items.map(item => item.getAttribute("aria-controls")))) {
  if (await page.locator(`#${control}`).count() !== 1) throw Error("Missing tab panel target");
}
await page.getByRole("tab").last().click();
await page
  .locator(".next-step-panel h3")
  .filter({ hasText: "Confirm a published DKIM key" })
  .waitFor();
await checkAccessibility("Guided setup");
await page.getByRole("checkbox").nth(1).check();
if (!(await page.locator(".readiness-total").textContent()).includes("60"))
  throw Error("Manual checkbox changed score");
await page.reload();
await page
  .getByRole("button", { name: "example.com", exact: true })
  .first()
  .click();
await page.getByRole("tab").last().click();
if (!(await page.getByRole("checkbox").nth(1).isChecked()))
  throw Error("Checklist not persisted");
await page.locator(".app-logo").click();
await page
  .locator(".domain-score > strong")
  .filter({ hasText: "60" })
  .waitFor();
improved = true;
await page.getByRole("button", { name: "Refresh score", exact: true }).click();
await page
  .locator(".domain-score > strong")
  .filter({ hasText: "100" })
  .waitFor();
await page.getByRole("button", { name: "Improve domain", exact: true }).click();
if (
  (await page.getByRole("tab").last().getAttribute("aria-selected")) !== "true"
)
  throw Error("Improve domain did not open guided plan");
await page
  .getByRole("heading", { name: "All assessed DNS checks pass", exact: true })
  .waitFor();
if ((await page.locator(".guided-checks .verified").count()) !== 5)
  throw Error("Recheck did not verify five checks");
await page.locator(".spf-flatten-tool > summary").click();
await page
  .getByRole("button", { name: "Generate flattened SPF", exact: true })
  .click();
await page
  .locator(".flatten-comparison pre")
  .last()
  .filter({ hasText: "v=spf1 ip4:192.0.2.1 ~all" })
  .waitFor();
if (!(await page.locator(".readiness-total").textContent()).includes("100"))
  throw Error("Generation changed the score");
await page.getByRole("button", { name: "Copy record", exact: true }).click();
if (
  (await page.evaluate(() => navigator.clipboard.readText())) !==
  "v=spf1 ip4:192.0.2.1 ~all"
)
  throw Error("Wrong copied record");
const downloadPromise = page.waitForEvent("download");
await page
  .getByRole("button", { name: "Download snapshot", exact: true })
  .click();
const download = await downloadPromise;
const exportPath = await download.path();
if (!readFileSync(exportPath, "utf8").includes("vendor.com"))
  throw Error("Export lost provenance");
await checkAccessibility("SPF generated result");
await page.screenshot({ path: "/tmp/dmark-spf-generator.png", fullPage: true });
flattenFailure = true;
await page
  .getByRole("button", { name: "Regenerate record", exact: true })
  .click();
await page
  .getByRole("alert")
  .filter({ hasText: "cannot safely flatten" })
  .waitFor();
if (await page.locator(".flatten-result").count())
  throw Error("Failed regeneration left a copyable stale candidate");
flattenFailure = false;
await page.screenshot({
  path: "/tmp/dmark-guided-desktop.png",
  fullPage: true,
});
await page.locator(".app-logo").click();
await page.screenshot({
  path: "/tmp/dmark-score-dashboard.png",
  fullPage: true,
});
await checkAccessibility("Scored workspace");
for (const width of [320, 360, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await noOverflow(`workspace ${width}`);
}
await page.setViewportSize({ width: 360, height: 900 });
await page
  .getByRole("button", { name: "example.com", exact: true })
  .first()
  .click();
await page.getByRole("tab").last().click();
await page.screenshot({ path: "/tmp/dmark-guided-mobile.png", fullPage: true });
const overflow = await page.evaluate(() => ({
  width: innerWidth,
  scroll: document.documentElement.scrollWidth,
}));
if (overflow.scroll > overflow.width)
  throw Error("Mobile overflow " + JSON.stringify(overflow));
await page
  .getByRole("button", { name: "Create account / sign in", exact: true })
  .first()
  .click();
if (!(await page.locator("dialog").evaluate((e) => e.open)))
  throw Error("Dialog closed");
await checkAccessibility("Account dialog");
const firstInput = page.locator("#account-email");
if (!(await firstInput.evaluate(input => input === document.activeElement))) throw Error("Dialog did not focus email field");
await page.keyboard.press("Escape");
await page.goto("http://localhost:3000/is/");
await checkAccessibility("Icelandic workspace");
await page.locator(".app-nav button").last().click();
await checkAccessibility("Icelandic reference guide");
await noOverflow("Icelandic guide 360");

// Account API mocks exercise UI transitions; backend session contracts have separate Go tests.
await page.unroute("**/api/account/**");
let signedIn = false;
let cloud = {
  version: 1,
  domains: [{ domain: "account.com", completed: ["dkim"] }],
};
let conflict = false;
await page.route("**/api/account/**", async (route) => {
  const action = new URL(route.request().url()).pathname
    .split("/")
    .filter(Boolean)
    .at(-1);
  if (action === "me")
    return route.fulfill({
      json: {
        authenticated: signedIn,
        email: "owner@example.com",
        available: true,
        csrf: "a".repeat(43),
      },
    });
  if (action === "start")
    return route.fulfill({ status: 202, json: { sent: true } });
  if (action === "logout") {
    signedIn = false;
    return route.fulfill({ json: { authenticated: false } });
  }
  if (action === "workspace" && route.request().method() === "GET")
    return route.fulfill({ json: cloud });
  if (action === "workspace" && route.request().method() === "POST") {
    if (conflict)
      return route.fulfill({
        status: 409,
        json: { code: "WORKSPACE_CONFLICT" },
      });
    const body = route.request().postDataJSON();
    cloud = { domains: body.domains, version: cloud.version + 1 };
    return route.fulfill({ json: cloud });
  }
  throw Error("Unexpected account route " + action);
});
await page.goto("http://localhost:3000/en/");
await page
  .getByRole("button", { name: "Create account / sign in", exact: true })
  .first()
  .click();
await page.getByLabel("Email address").fill("owner@example.com");
await page
  .getByRole("button", { name: "Send sign-in link", exact: true })
  .click();
await page.getByText("Check your inbox", { exact: true }).waitFor();
await page.keyboard.press("Escape");
signedIn = true;
await page.reload();
await page
  .getByRole("button", { name: "Import browser domains", exact: true })
  .click();
await page.getByRole("button", { name: "Save workspace", exact: true }).click();
await page
  .getByText("Workspace saved to your account.", { exact: true })
  .waitFor();
if (cloud.domains.length !== 2) throw Error("Import overwrote account domains");
if (
  (await context.cookies()).some(
    (cookie) => cookie.name === "dmark_workspace_v2",
  )
)
  throw Error("Successful import did not clear guest cookie");
await page.reload();
await page
  .getByRole("button", { name: "example.com", exact: true })
  .first()
  .click();
await page.getByRole("tab").last().click();
if (!(await page.getByRole("checkbox").nth(1).isChecked()))
  throw Error("Imported checklist lost");
conflict = true;
await page.getByRole("checkbox").nth(2).check();
await page.getByRole("button", { name: "Save workspace", exact: true }).click();
await page
  .getByRole("alert")
  .filter({ hasText: "another tab or device" })
  .waitFor();
if (!(await page.getByRole("checkbox").nth(2).isChecked()))
  throw Error("Conflict discarded work");
conflict = false;
await page.getByRole("button", { name: "Save workspace", exact: true }).click();
await page
  .getByText("Workspace saved to your account.", { exact: true })
  .waitFor();
await page.getByRole("button", { name: "Sign out", exact: true }).click();
await page
  .getByRole("heading", { name: "Start with your first domain", exact: true })
  .waitFor();
// Cookie blocking must keep the app usable and display a truthful persistence warning.
const blocked = await browser.newContext({
  viewport: { width: 360, height: 900 },
});
await blocked.addInitScript(() =>
  Object.defineProperty(Document.prototype, "cookie", {
    configurable: true,
    get() {
      return "";
    },
    set() {},
  }),
);
await blocked.route("**/api/account/**", (route) =>
  route.fulfill({
    json: { authenticated: false, available: false, csrf: "x".repeat(43) },
  }),
);
const blockedPage = await blocked.newPage();
await blockedPage.goto("http://localhost:3000/en/");
await blockedPage.locator("#add-domain").fill("example.com");
await blockedPage
  .getByRole("button", { name: "Add domain", exact: true })
  .click();
await blockedPage
  .getByRole("status")
  .filter({ hasText: "Cookies are blocked" })
  .waitFor();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "WCAG axe checks, keyboard tabs, form errors, dialog focus, responsive overflow, dashboard score, cached reload, guided next action, verified improvement, manual-progress separation, mobile guide, guest/account persistence and blocked-cookie flows passed.",
);
await browser.close();
server.kill();
