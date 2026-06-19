import type { Metadata } from "next";
import { headers } from "next/headers";
import { Lock, MailCheck, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { DashboardLockedCTALink } from "@/components/dashboard-locked-analytics";
import { DmarkDashboard } from "@/components/dmark-dashboard";
import { isDashboardAccessEnabled } from "@/lib/dashboard-access";
import { isDashboardAuthentikSessionAllowed } from "@/lib/dashboard-authentik-access";
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

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Metadata'});
  return {
    title: `Dashboard | ${t("title")}`,
    description: "Dmark domain trust operations dashboard for DMARC, SPF, Reporter, alerts, and remediation.",
    robots: {
      index: false,
      follow: false,
    },
  };
}

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ params, searchParams }: DashboardPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!isDashboardAccessEnabled()) {
    return <DashboardLocked />;
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const loginStatus = firstSearchParam(resolvedSearchParams.login);
  const requestHeaders = await headers();
  if (!isDashboardAuthentikSessionAllowed(requestHeaders)) {
    return <DashboardLoginRequired loginStatus={loginStatus} />;
  }

  const initialState = await loadInitialDashboardState(requestHeaders);

  return (
    <DmarkDashboard
      initialDashboard={initialState.dashboard}
      initialAlerts={initialState.alerts}
      initialSettings={initialState.settings}
      initialNotice={initialState.notice}
    />
  );
}

function DashboardLocked() {
  const t = useTranslations("Dashboard.locked");
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#ffffff_70%)] px-5 py-10 text-navy sm:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-4xl place-items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-trust">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {t("badge")}
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">
            {t("title")}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {t("description")}
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <DashboardLockedCTALink
              href="/#scanner"
              source="dashboard_beta_lock_scan"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-trust px-5 font-semibold text-white transition hover:bg-trust-hover"
            >
              <MailCheck className="h-4 w-4" aria-hidden="true" />
              {t("scan")}
            </DashboardLockedCTALink>
            <DashboardLockedCTALink
              href="/#pricing"
              source="dashboard_beta_lock_access"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 font-semibold text-navy transition hover:bg-slate-50"
            >
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {t("access")}
            </DashboardLockedCTALink>
          </div>
          <p className="mt-6 text-sm text-slate-500">
            {t("internal")} <code className="rounded bg-slate-100 px-1.5 py-0.5">DMARK_DASHBOARD_ACCESS=open</code>.
          </p>
        </div>
      </section>
    </main>
  );
}

function DashboardLoginRequired({ loginStatus }: { loginStatus?: string }) {
  const t = useTranslations("Dashboard.login");
  const recoveryKey = dashboardLoginRecoveryKey(loginStatus);
  const recoveryMessage = recoveryKey ? t(`recovery.${recoveryKey}`) : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#ffffff_70%)] px-5 py-10 text-navy sm:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-4xl place-items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-trust">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {t("badge")}
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{t("title")}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            {t("description")}
          </p>
          {recoveryMessage ? (
            <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950" role="status">
              <p className="font-semibold">{recoveryMessage}</p>
              <p className="mt-2">
                {t("recovery.clear")}
              </p>
            </div>
          ) : null}
          <Link className="mt-8 inline-flex min-h-12 items-center justify-center rounded-md bg-trust px-5 font-semibold text-white transition hover:bg-trust-hover" href="/api/dashboard/auth/login">
            {t("button")}
          </Link>
          <p className="mt-6 text-sm text-slate-500">
            {t("scoped")}
          </p>
        </div>
      </section>
    </main>
  );
}

function firstSearchParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function dashboardLoginRecoveryKey(loginStatus?: string): "expired" | "forbidden" | "unconfigured" | null {
  switch (loginStatus) {
    case "authentik-failed":
      return "expired";
    case "authentik-forbidden":
      return "forbidden";
    case "authentik-unconfigured":
      return "unconfigured";
    default:
      return null;
  }
}

async function loadInitialDashboardState(requestHeaders: Headers): Promise<DashboardInitialState> {
  if (shouldUseDashboardMock()) {
    return {
      dashboard: mockDashboardViewModel,
      alerts: mockDashboardAlerts,
      settings: mockSettings,
      notice: "Mock dashboard data loaded.",
    };
  }

  try {
    const baseURL = await requestBaseURL(requestHeaders);
    const [dashboard, alerts, settings] = await Promise.all([
      dashboardProxyJSON<BackendDashboardResponse>(baseURL, "/api/dashboard", requestHeaders),
      dashboardProxyJSON<BackendDashboardAlertsResponse>(baseURL, "/api/dashboard/alerts", requestHeaders),
      dashboardProxyJSON<BackendDashboardSettingsResponse>(baseURL, "/api/dashboard/settings", requestHeaders),
    ]);

    return {
      dashboard: mapDashboardResponse(dashboard),
      alerts: mapAlertsResponse(alerts),
      settings: mapSettingsResponse(settings),
      notice: "Dashboard data loaded.",
    };
  } catch (error) {
    if (error instanceof DashboardPageFetchError && (error.status === 401 || error.status === 403)) {
      return emptyDashboardState("Dashboard service credentials are unauthenticated or missing required scopes.");
    }

    const message = error instanceof Error ? error.message : "Dashboard service unavailable.";
    return emptyDashboardState(message);
  }
}

async function requestBaseURL(requestHeaders: Headers): Promise<URL> {
  const host = requestHeaders.get("x-forwarded-host") || requestHeaders.get("host") || "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return new URL(`${protocol}://${host}`);
}

async function dashboardProxyJSON<T>(baseURL: URL, path: string, requestHeaders: Headers): Promise<T> {
  const response = await fetch(new URL(path, baseURL), {
    cache: "no-store",
    headers: {
      cookie: requestHeaders.get("cookie") || "",
    },
  });

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
