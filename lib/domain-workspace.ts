import { validateScannableDomain } from "./scan";

export const workspaceKey = "dmark:domains:v1";
export const maxSavedDomains = 20;
export const setupSteps = ["senders", "spf", "dkim", "reports", "dmarc", "bimi"] as const;
export type SetupStep = typeof setupSteps[number];
export type SavedDomain = { domain: string; completed: SetupStep[] };

/** Keep only user-selected domain names and checklist progress, never scan payloads. */
export function parseWorkspace(raw: string | null): SavedDomain[] {
  if (!raw || raw.length > 32_000) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    const domains = new Map<string, SavedDomain>();
    for (const item of data.slice(0, maxSavedDomains)) {
      if (!item || typeof item !== "object" || typeof item.domain !== "string") continue;
      const value = validateScannableDomain(item.domain);
      if (value.error) continue;
      const completed = Array.isArray(item.completed)
        ? setupSteps.filter(step => item.completed.includes(step)) : [];
      domains.set(value.domain, { domain: value.domain, completed });
    }
    return Array.from(domains.values());
  } catch { return []; }
}
