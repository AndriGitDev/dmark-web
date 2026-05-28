import type { Metadata } from "next";
import { headers } from "next/headers";
import { DmarkDashboard } from "@/components/dmark-dashboard";
import {
  shouldUseDashboardMock,
  type BackendDashboardAlertsResponse,
  type BackendDashboardResponse,
  type BackendDashboardSettingsResponse,
} from "@/lib/dashboard-api";
import {
  emptyDashboardState,
  mapAlertsResponse,
  mapDashboardResponse,
  mapSettingsResponse,
  mockDashboardAlerts,
  mockDashboardViewModel,
  mockSettings,
  type DashboardInitialState,
} from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | dmark.is",
  description: "Dmark domain trust operations dashboard for DMARC, SPF, Reporter, alerts, and remediation.",
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const initialState = await loadInitialDashboardState();

  return (
    <DmarkDashboard
      initialDashboard={initialState.dashboard}
      initialAlerts={initialState.alerts}
      initialSettings={initialState.settings}
      initialNotice={initialState.notice}
    />
  );
}

async function loadInitialDashboardState(): Promise<DashboardInitialState> {
  if (shouldUseDashboardMock()) {
    return {
      dashboard: mockDashboardViewModel,
      alerts: mockDashboardAlerts,
      settings: mockSettings,
      notice: "Mock dashboard data loaded.",
    };
  }

  try {
    const baseURL = await requestBaseURL();
    const [dashboard, alerts, settings] = await Promise.all([
      dashboardProxyJSON<BackendDashboardResponse>(baseURL, "/api/dashboard"),
      dashboardProxyJSON<BackendDashboardAlertsResponse>(baseURL, "/api/dashboard/alerts"),
      dashboardProxyJSON<BackendDashboardSettingsResponse>(baseURL, "/api/dashboard/settings"),
    ]);

    return {
      dashboard: mapDashboardResponse(dashboard),
      alerts: mapAlertsResponse(alerts),
      settings: mapSettingsResponse(settings),
      notice: "Dashboard data loaded from backend.",
    };
  } catch (error) {
    if (error instanceof DashboardPageFetchError && (error.status === 401 || error.status === 403)) {
      return emptyDashboardState("Dashboard backend token is unauthenticated or missing required scopes.");
    }

    const message = error instanceof Error ? error.message : "Dashboard backend unavailable.";
    return emptyDashboardState(message);
  }
}

async function requestBaseURL(): Promise<URL> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return new URL(`${protocol}://${host}`);
}

async function dashboardProxyJSON<T>(baseURL: URL, path: string): Promise<T> {
  const response = await fetch(new URL(path, baseURL), { cache: "no-store" });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new DashboardPageFetchError(payload.error || `Dashboard request failed with ${response.status}.`, response.status);
  }

  return (await response.json()) as T;
}

class DashboardPageFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardPageFetchError";
    this.status = status;
  }
}
