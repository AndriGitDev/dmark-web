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
  const base = process.env.DMARK_APP_API_BASE_URL?.trim();

  if (!base) {
    throw new DashboardAPIError("Dashboard backend base URL is not configured.", 503);
  }

  try {
    const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
    if (!url.pathname.startsWith("/api/v1/dashboard")) {
      throw new DashboardAPIError("Dashboard backend path is not allowed.", 500);
    }
    return url;
  } catch (error) {
    if (error instanceof DashboardAPIError) throw error;
    throw new DashboardAPIError("Dashboard backend base URL is invalid.", 503);
  }
}

export async function dashboardFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await dashboardProxyFetch(path, init);
  return (await response.json()) as T;
}

export async function dashboardProxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = process.env.DMARK_APP_API_TOKEN?.trim();

  if (!token) {
    throw new DashboardAPIError("Dashboard backend API token is not configured.", 503);
  }

  const url = dashboardBackendURL(path);
  const headers = new Headers(init.headers);
  headers.set("accept", headers.get("accept") || "application/json");
  headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
  });

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
