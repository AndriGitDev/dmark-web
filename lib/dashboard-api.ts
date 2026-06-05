import "server-only";

export type BackendDashboardDomain = {
  id: string;
  domain: string;
  created_at?: string;
  last_checked_at?: string;
  status: "protected" | "monitoring" | "needs-work" | string;
  score: number;
  dmarc_policy: "none" | "quarantine" | "reject" | string;
  spf_lookup_count: number;
  dkim_coverage: "covered" | "missing" | "unknown" | string;
  alignment_rate: number;
  unknown_sender_count: number;
  next_action?: string;
};

export type BackendDashboardResponse = {
  generated_at: string;
  protected_domain_count: number;
  average_score: number;
  alert_count: number;
  unknown_sender_count: number;
  domains: BackendDashboardDomain[];
};

export type BackendDashboardDomainsResponse = {
  domains: BackendDashboardDomain[];
};

export type BackendDashboardDomainDetailResponse = {
  domain: BackendDashboardDomain;
  history: unknown[];
};

export type BackendDashboardRecheckResponse = {
  job_id?: string;
  check_id?: string;
  domain_id: string;
  status: "queued" | "coalesced" | "completed" | string;
  queued_at?: string;
  next_allowed_at?: string;
};

export type BackendDashboardDNSChange = {
  id: string;
  title: string;
  status: "ready" | "review" | "waiting" | "blocked" | string;
  record_name?: string;
  record_type?: string;
  record_text: string;
  evidence?: string;
  risk?: string;
  rollback_note?: string;
};

export type BackendDashboardChangePlanResponse = {
  domain_id: string;
  domain: string;
  generated_at: string;
  journey_state?: string;
  next_action?: string;
  changes: BackendDashboardDNSChange[];
};

export type BackendDashboardSender = {
  source_ip?: string;
  provider: string;
  volume: number;
  aligned_percentage: number;
  classification: "expected" | "unknown" | string;
  trend?: string;
  risk?: string;
  first_seen?: string;
  last_seen?: string;
};

export type BackendDashboardReporterResponse = {
  domain_id: string;
  domain: string;
  report_volume: number;
  aligned_percentage: number;
  reporter_org_count: number;
  failures: number;
  reject_candidates: number;
  setup_guidance?: string;
  sender_inventory: BackendDashboardSender[];
};

export type BackendDashboardBrandRiskFinding = {
  category: string;
  type: string;
  title: string;
  severity: "Info" | "Low" | "Medium" | "High" | "Critical" | string;
  evidence: string;
  recommended_action: string;
};

export type BackendDashboardLookalikeRiskSignal = {
  domain: string;
  kind: "typo" | "homoglyph" | string;
  reason: string;
  has_address_records: boolean;
  has_mx_records: boolean;
  severity: "Info" | "Low" | "Medium" | "High" | "Critical" | string;
  evidence: string;
  recommended_action: string;
};

export type BackendDashboardBrandRiskResponse = {
  domain_id: string;
  domain: string;
  generated_at: string;
  findings: BackendDashboardBrandRiskFinding[];
  lookalikes: BackendDashboardLookalikeRiskSignal[];
};

export type BackendDashboardAlert = {
  id: string;
  domain_id?: string;
  domain: string;
  check_name?: string;
  kind?: string;
  severity: "critical" | "warn" | "info" | "high" | "medium" | "low" | string;
  message: string;
  evidence?: string;
  created_at?: string;
  acknowledged?: boolean;
};

export type BackendDashboardAlertsResponse = {
  alerts: BackendDashboardAlert[];
};

export type BackendDashboardAlertActionResponse = {
  id: string;
  status: "acknowledged" | "muted" | string;
  applied_at: string;
};

export type BackendDashboardSettingsResponse = {
  require_alignment_before_reject: number;
  pause_automation_on_unknown_senders_spike: boolean;
  auto_generate_monthly_executive_reports: boolean;
  notification_channels: string[];
  updated_at?: string;
};

export type BackendDashboardSPFRouteSource = {
  kind: "include" | "ip4" | "ip6" | string;
  value: string;
  label?: string;
};

export type BackendDashboardSPFRouteEvidence = {
  source_value?: string;
  resolved_domain?: string;
  mechanism?: string;
  kind?: string;
  message?: string;
};

export type BackendDashboardSPFRouteResponse = {
  id: string;
  domain_id: string;
  domain: string;
  status: string;
  route_fqdn?: string;
  customer_cname_name?: string;
  customer_cname_target?: string;
  generated_spf_preview?: string;
  last_published_spf?: string;
  last_synced_at?: string;
  last_sync_error?: string;
  enabled_sources?: BackendDashboardSPFRouteSource[];
  evidence_summary?: BackendDashboardSPFRouteEvidence[];
};

export type BackendDashboardSPFRouteSyncResponse = {
  job_id?: string;
  domain_id: string;
  status: string;
  queued_at?: string;
};

export type BackendDashboardDNSProviderDetection = {
  status: string;
  provider_id?: string;
  provider_name?: string;
  confidence: string;
  evidence_nameservers: string[];
  dns_dashboard_url?: string;
};

export type BackendDashboardDNSInstruction = {
  kind: string;
  record_name: string;
  record_type: string;
  record_value: string;
  ttl: number;
  provider_id?: string;
  provider_name: string;
  dashboard_url?: string;
  steps: string[];
};

export type BackendDashboardDNSGuidanceResponse = {
  domain_id: string;
  domain: string;
  generated_at: string;
  detection: BackendDashboardDNSProviderDetection;
  resolver_error?: string;
  instructions: BackendDashboardDNSInstruction[];
};

type BackendErrorPayload = {
  error?: string;
  message?: string;
  detail?: string;
};

export class DashboardAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardAPIError";
    this.status = status;
  }
}

export function shouldUseDashboardMock(): boolean {
  return process.env.DMARK_DASHBOARD_MOCK === "1";
}

export function dashboardBackendURL(path: string): URL {
  const base = (process.env.DMARK_APP_API_BASE_URL || process.env.DMARK_API_BASE_URL || "").trim();

  if (!base) {
    throw new DashboardAPIError("Dashboard backend base URL is not configured.", 503);
  }

  try {
    const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
    if (!isAllowedDashboardBackendPath(url.pathname)) {
      throw new DashboardAPIError("Dashboard backend path is not allowed.", 500);
    }
    return url;
  } catch (error) {
    if (error instanceof DashboardAPIError) throw error;
    throw new DashboardAPIError("Dashboard backend base URL is invalid.", 503);
  }
}

function isAllowedDashboardBackendPath(pathname: string): boolean {
  return pathname.startsWith("/api/v1/dashboard") || pathname === "/api/v1/domains";
}

export async function dashboardFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await dashboardProxyFetch(path, init);
  return (await response.json()) as T;
}

export async function dashboardProxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = (process.env.DMARK_APP_API_TOKEN || process.env.DMARK_API_TOKEN || "").trim();

  if (!token) {
    throw new DashboardAPIError("Dashboard backend API token is not configured.", 503);
  }

  const url = dashboardBackendURL(path);
  const headers = new Headers(init.headers);
  headers.set("accept", headers.get("accept") || "application/json");
  headers.set("authorization", `Bearer ${token}`);
  const timeoutMs = Number(process.env.DMARK_API_TIMEOUT_MS || 10000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 10000);

  if (init.signal) {
    init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new DashboardAPIError("Dashboard backend request timed out.", 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new DashboardAPIError(await dashboardErrorMessage(response), response.status);
  }

  return response;
}

export async function dashboardErrorMessage(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json().catch(() => ({}))) as BackendErrorPayload;
    return payload.error || payload.message || payload.detail || `Dashboard backend returned ${response.status}.`;
  }

  const text = await response.text().catch(() => "");
  return text.trim() || `Dashboard backend returned ${response.status}.`;
}

export function dashboardAPIErrorResponse(error: unknown): { status: number; body: { error: string } } {
  if (error instanceof DashboardAPIError) {
    return { status: error.status, body: { error: error.message } };
  }

  return { status: 502, body: { error: "Dashboard backend request failed." } };
}
