type PrivacyEventName =
  | "scan_start"
  | "scan_complete"
  | "scan_error"
  | "scan_validation_error"
  | "recommendation_view"
  | "cta_click"
  | "claim_start"
  | "claim_complete"
  | "claim_error"
  | "dashboard_interaction";
type PrivacyEventStatus = "PASS" | "WARNING" | "FAIL" | "ERROR";
type PrivacyEventSource =
  | "public_scanner"
  | "nav"
  | "pricing"
  | "footer"
  | "result_upsell"
  | "upgrade_modal"
  | "dashboard_nav"
  | "dashboard_domain_recheck"
  | "dashboard_spf_route"
  | "dashboard_alerts"
  | "dashboard_settings"
  | "dashboard_export"
  | "dashboard_beta_lock_scan"
  | "dashboard_beta_lock_access";

type PrivacyEventProperties = {
  status?: string;
  source?: string;
};

type AnalyticsTarget = {
  plausible?: (eventName: string, options?: { props?: Record<string, string> }) => void;
  umami?: { track?: (eventName: string, properties?: Record<string, string>) => void };
  posthog?: { capture?: (eventName: string, properties?: Record<string, string>) => void };
};

const allowedEvents = new Set<PrivacyEventName>([
  "scan_start",
  "scan_complete",
  "scan_error",
  "scan_validation_error",
  "recommendation_view",
  "cta_click",
  "claim_start",
  "claim_complete",
  "claim_error",
  "dashboard_interaction",
]);
const allowedStatuses = new Set<PrivacyEventStatus>(["PASS", "WARNING", "FAIL", "ERROR"]);
const allowedSources = new Set<PrivacyEventSource>([
  "public_scanner",
  "nav",
  "pricing",
  "footer",
  "result_upsell",
  "upgrade_modal",
  "dashboard_nav",
  "dashboard_domain_recheck",
  "dashboard_spf_route",
  "dashboard_alerts",
  "dashboard_settings",
  "dashboard_export",
  "dashboard_beta_lock_scan",
  "dashboard_beta_lock_access",
]);

function sanitizePrivacyEventName(value: string): PrivacyEventName | null {
  return allowedEvents.has(value as PrivacyEventName) ? (value as PrivacyEventName) : null;
}

export function sanitizePrivacyEventProperties(properties: PrivacyEventProperties = {}): Record<string, string> | null {
  const sanitized: Record<string, string> = {};

  if (typeof properties.status === "string") {
    if (!allowedStatuses.has(properties.status as PrivacyEventStatus)) return null;
    sanitized.status = properties.status;
  }

  if (typeof properties.source === "string") {
    if (!allowedSources.has(properties.source as PrivacyEventSource)) return null;
    sanitized.source = properties.source;
  }

  return sanitized;
}

export function trackPrivacyEvent(
  name: string,
  properties: PrivacyEventProperties = {},
  target: AnalyticsTarget = globalThis as AnalyticsTarget,
): void {
  const eventName = sanitizePrivacyEventName(name);
  if (!eventName) return;

  const sanitizedProperties = sanitizePrivacyEventProperties(properties);
  if (!sanitizedProperties) return;
  const props: Record<string, string> = sanitizedProperties;

  try {
    target.plausible?.(eventName, { props });
  } catch {
    // Analytics must never affect product flow.
  }

  try {
    target.umami?.track?.(eventName, props);
  } catch {
    // Analytics must never affect product flow.
  }

  try {
    target.posthog?.capture?.(eventName, props);
  } catch {
    // Analytics must never affect product flow.
  }
}
