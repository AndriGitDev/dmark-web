import { validateScannableDomain } from "./scan";
import { validSelector } from "./authentication-records";

export const workspaceKey = "dmark:domains:v1";
export const workspaceCookie = "dmark_workspace_v2";
export const maxSavedDomains = 20;
export const setupSteps = [
  "senders",
  "spf",
  "dkim",
  "reports",
  "dmarc",
  "bimi",
] as const;
export type SetupStep = (typeof setupSteps)[number];
export type SavedDomain = {
  domain: string;
  completed: SetupStep[];
  selector?: string;
};

/** Keep only user-selected domain names and checklist progress, never scan payloads. */
export function parseWorkspace(raw: string | null): SavedDomain[] {
  if (!raw || raw.length > 32_000) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const domains = new Map<string, SavedDomain>();
    for (const item of data.slice(0, maxSavedDomains)) {
      if (!item || typeof item !== "object" || typeof item.domain !== "string")
        continue;
      const value = validateScannableDomain(item.domain);
      if (value.error) continue;
      const completed = Array.isArray(item.completed)
        ? setupSteps.filter((step) => item.completed.includes(step))
        : [];
      const selector =
        typeof item.selector === "string" && validSelector(item.selector)
          ? item.selector
          : "";
      domains.set(value.domain, {
        domain: value.domain,
        completed,
        ...(selector ? { selector } : {}),
      });
    }
    return Array.from(domains.values());
  } catch {
    return [];
  }
}

export function encodeWorkspace(domains: SavedDomain[]): string {
  const rows = domains.map((item) => [
    item.domain,
    setupSteps.reduce(
      (flags, step, i) =>
        item.completed.includes(step) ? flags | (1 << i) : flags,
      0,
    ),
    item.selector ?? "",
  ]);
  const value = encodeURIComponent(JSON.stringify({ v: 2, d: rows }));
  if (domains.length > maxSavedDomains || value.length > 3700)
    throw new Error("COOKIE_LIMIT");
  return value;
}

export function readWorkspaceCookie(cookies: string): SavedDomain[] {
  const value = cookies
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(workspaceCookie + "="))
    ?.slice(workspaceCookie.length + 1);
  if (!value || value.length > 3800) return [];
  try {
    const data = JSON.parse(decodeURIComponent(value));
    if (
      data.v !== 2 ||
      !Array.isArray(data.d) ||
      data.d.length > maxSavedDomains
    )
      return [];
    return parseWorkspace(
      JSON.stringify(
        data.d
          .filter(
            (row: unknown) =>
              Array.isArray(row) &&
              typeof row[0] === "string" &&
              Number.isInteger(row[1]) &&
              row[1] >= 0 &&
              row[1] < 64,
          )
          .map((row: [string, number, string]) => ({
            domain: row[0],
            completed: setupSteps.filter((_, i) => row[1] & (1 << i)),
            selector: row[2],
          })),
      ),
    );
  } catch {
    return [];
  }
}

/** Browser persistence lives outside React's render and state calculations. */
export function writeWorkspaceCookie(value: string, expires = false) {
  document.cookie = `${workspaceCookie}=${value}; Path=/; Max-Age=${expires ? 0 : 31536000}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
}
