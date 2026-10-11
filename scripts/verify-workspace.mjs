import { spawn } from "node:child_process";
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
await page.goto("http://localhost:3000/en/");
await page.locator("#add-domain").fill("example.com");
await page.getByRole("button", { name: "Add domain", exact: true }).click();

await page.getByRole("tab").last().click();
await page.getByRole("checkbox").nth(1).check();
await page.reload();
await page
  .getByRole("button", { name: "example.com", exact: true })
  .first()
  .click();
await page.getByRole("tab").last().click();
if (!(await page.getByRole("checkbox").nth(1).isChecked()))
  throw Error("Checklist not persisted");
await page.locator(".app-logo").click();
await page.setViewportSize({ width: 360, height: 900 });
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
await page.keyboard.press("Escape");
await page.goto("http://localhost:3000/is/");

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
  "Guest persistence, checklist, dialog, IS/EN, mobile, account import/save/conflict/logout and blocked-cookie flows passed.",
);
await browser.close();
server.kill();
