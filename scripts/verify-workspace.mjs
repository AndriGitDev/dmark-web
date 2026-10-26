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
// Surface failures as GitHub annotations so they are readable without the raw job log.
process.on("uncaughtException", async (error) => {
  const message = String(error?.message || error).split("\n").filter(Boolean).slice(0, 4).join(" | ");
  let state = "";
  try {
    state = await page.evaluate(() => [location.pathname, document.querySelector("#verdict-title")?.textContent, document.querySelector(".app-error")?.textContent, document.querySelector(".fix-step.step-now summary")?.textContent].map((v) => v ?? "-").join(" | "));
  } catch {}
  console.log(`::error title=Browser suite::${message} || page: ${state}`.replace(/\r?\n/g, " "));
  process.exit(1);
});
// Cookie-only privacy: the app must never call an account backend.
await page.route("**/api/account/**", (r) => {
  errors.push("Unexpected account request " + r.request().url());
  return r.fulfill({ status: 404, json: {} });
});
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
      spf: { valid: true, lookups: 1, record: "v=spf1 include:spf.protection.outlook.com -all" },
      dmarc: improved
        ? { valid: true, policy: "reject", record: "v=DMARC1; p=reject" }
        : { valid: false, policy: "unknown", record: "" },
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
      mail: { mx: ["example-com.mail.protection.outlook.com"], ns: ["ana.ns.cloudflare.com"], mxKnown: true, nsKnown: true },
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
await page.getByRole("heading", { name: "Is your email protected?", exact: true }).waitFor();
await checkAccessibility("English empty homepage");
await page.locator("#add-domain").fill("not-a-domain");
await page.getByRole("button", { name: "Check", exact: true }).click();
await page.locator("#add-domain-error").waitFor();
if (await page.locator("#add-domain").getAttribute("aria-invalid") !== "true") throw Error("Missing input invalid state");
if (await page.evaluate(() => document.activeElement?.id) !== "add-domain") throw Error("Invalid input did not receive focus");
await checkAccessibility("Domain validation error");
await page.locator("#add-domain").fill("example.com");
await page.getByRole("button", { name: "Check", exact: true }).click();

// Plain-language verdict, detected provider and DNS host, and the next step open.
await page.locator("#verdict-title").filter({ hasText: "Anyone can send email pretending to be example.com" }).waitFor();
await page.locator(".verdict-facts").filter({ hasText: "Microsoft 365" }).filter({ hasText: "Cloudflare" }).waitFor();
if ((await page.locator(".fix-step.step-done").count()) !== 1) throw Error("SPF should already be done");
await page.locator(".fix-step.step-now summary").filter({ hasText: "Turn on email signing (DKIM)" }).waitFor();
await page.locator(".step-now .step-wait").filter({ hasText: "DNS only" }).waitFor();
await checkAccessibility("Fix plan");

// Exact records are copyable, including from a later step.
await page.locator(".fix-step summary").filter({ hasText: "Add a DMARC record" }).click();
await page.getByRole("button", { name: "Copy value for _dmarc", exact: true }).first().click();
if ((await page.evaluate(() => navigator.clipboard.readText())) !== "v=DMARC1; p=none;")
  throw Error("Wrong DMARC record copied");
const mailto = await page.getByRole("link", { name: "Open in email" }).getAttribute("href");
if (!mailto?.startsWith("mailto:?") || !decodeURIComponent(mailto).includes("_dmarc.example.com") || !decodeURIComponent(mailto).includes("selector1._domainkey.example.com"))
  throw Error("IT message lacks the records");
await page.screenshot({ path: "/tmp/dmark-fix-plan.png", fullPage: true });

// The saved domain survives a reload and reopening it rechecks automatically.
await page.reload();
await page.locator(".domain-card .pill-exposed").filter({ hasText: "Not protected" }).waitFor();
improved = true;
await page.locator(".domain-card .domain-open").filter({ hasText: "example.com" }).click();
await page.locator("#verdict-title").filter({ hasText: "example.com is protected against email spoofing" }).waitFor();
if ((await page.locator(".fix-step.step-done").count()) !== 5) throw Error("Recheck did not complete all steps");
await page.getByRole("heading", { name: "Everything is in place", exact: true }).waitFor();
if (await page.locator(".send-to-it").count()) throw Error("Send-to-IT shown for a protected domain");

// Technical details keep the advanced tools.
await page.locator(".tech-details > summary").click();
if (!(await page.locator(".readiness-total").textContent()).includes("100"))
  throw Error("Technical readiness missing");
await page.locator(".spf-flatten-tool > summary").click();
await page
  .getByRole("button", { name: "Generate flattened SPF", exact: true })
  .click();
await page
  .locator(".flatten-comparison pre")
  .last()
  .filter({ hasText: "v=spf1 ip4:192.0.2.1 ~all" })
  .waitFor();
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
await page.locator(".app-logo").click();
await page.locator(".domain-card .pill-protected").filter({ hasText: "Protected" }).waitFor();
await checkAccessibility("Saved domains");
for (const width of [320, 360, 768, 1440]) {
  await page.setViewportSize({ width, height: 900 });
  await noOverflow(`homepage ${width}`);
}
improved = false;
await page.setViewportSize({ width: 360, height: 900 });
await page.locator(".domain-card .domain-open").filter({ hasText: "example.com" }).click();
await page.locator(".verdict .app-button").click();
await page.locator("#verdict-title").filter({ hasText: "Anyone can send email" }).waitFor();
await page.screenshot({ path: "/tmp/dmark-fix-plan-mobile.png", fullPage: true });
await noOverflow("fix plan 360");
await page.setViewportSize({ width: 320, height: 900 });
await noOverflow("fix plan 320");
if (await page.getByText(/sign in|create account/i).count()) throw Error("Account UI still visible");
await page.goto("http://localhost:3000/en/");
await page.getByText("We never ask who you are.", { exact: true }).waitFor();
await page.getByText("No account · No email", { exact: true }).first().waitFor();
await page.goto("http://localhost:3000/is/");
await checkAccessibility("Icelandic workspace");
await page.locator(".app-nav a").click();
await page.getByRole("heading", { name: "Leiðbeiningar um tölvupóstöryggi", exact: true }).waitFor();
await checkAccessibility("Icelandic guide index");
await noOverflow("Icelandic guide index 360");
for (const path of ["/is/leidbeiningar/microsoft-365/", "/en/guides/google-workspace/", "/en/guides/domain-without-email/", "/is/leidbeiningar/hvad-er-dmarc/"]) {
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://localhost:3000${path}`);
    await page.locator(".guide-answer").waitFor();
    await noOverflow(`${path} ${width}`);
  }
  await checkAccessibility(path);
}
await page.goto("http://localhost:3000/en/guides/microsoft-365/");
await page.getByRole("button", { name: "Copy v=spf1 include:spf.protection.outlook.com -all", exact: true }).click();
if ((await page.evaluate(() => navigator.clipboard.readText())) !== "v=spf1 include:spf.protection.outlook.com -all")
  throw Error("Guide copy button copied the wrong record");
await page.screenshot({ path: "/tmp/dmark-guide-mobile.png", fullPage: true });
await page.getByRole("link", { name: "Íslenska", exact: true }).click();
await page.waitForURL("**/is/leidbeiningar/microsoft-365/");

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
const blockedPage = await blocked.newPage();
await blockedPage.goto("http://localhost:3000/en/");
await blockedPage.locator("#add-domain").fill("example.com");
await blockedPage
  .getByRole("button", { name: "Check", exact: true })
  .click();
await blockedPage
  .getByRole("status")
  .filter({ hasText: "Cookies are blocked" })
  .waitFor();
if (errors.length) throw Error(errors.join("\n"));
console.log(
  "WCAG axe checks, form errors, plain-language verdict, provider and DNS host detection, copyable records, send-to-IT message, saved-domain reload with automatic recheck, verified improvement, technical SPF tools, guide pages (a11y, overflow, copy, language switch), responsive overflow, cookie-only persistence, privacy card and blocked-cookie flows passed.",
);
await browser.close();
server.kill();
