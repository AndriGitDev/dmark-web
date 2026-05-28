"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  Copy,
  DatabaseZap,
  Download,
  Filter,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  MailCheck,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  acknowledgeDashboardAlert,
  fetchReporterCSV,
  getChangePlan,
  getDashboardData,
  getReporterData,
  muteDashboardAlert,
  recheckDashboardDomain,
  saveDashboardSettings,
  type AlertSeverity,
  type ChangePlanViewModel,
  type DashboardAlert,
  type DashboardIconName,
  type DashboardMetric,
  type DashboardViewModel,
  type DomainStatus,
  type ProtectedDomain,
  type ReporterViewModel,
  type SettingsState,
} from "@/lib/dashboard";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "domains", label: "Domains", icon: Globe2 },
  { id: "reporter", label: "Reporter", icon: BarChart3 },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabID = (typeof navItems)[number]["id"];
type SettingsKey = "alignmentGate" | "pauseOnUnknownSpike" | "monthlyReports";
type LoadState = "idle" | "loading" | "ready" | "error";

type DmarkDashboardProps = {
  initialDashboard: DashboardViewModel;
  initialAlerts: DashboardAlert[];
  initialSettings: SettingsState;
  initialNotice?: string;
};

function metricTone(tone: DashboardMetric["tone"]) {
  switch (tone) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "red":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

function statusTone(status: DomainStatus) {
  switch (status) {
    case "protected":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "monitoring":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

function severityTone(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function formatStatus(status: DomainStatus) {
  if (status === "needs-work") return "Needs work";
  if (status === "monitoring") return "Monitoring";
  return "Protected";
}

function dashboardIcon(icon: DashboardIconName): LucideIcon {
  switch (icon) {
    case "alert-triangle":
      return AlertTriangle;
    case "check-circle":
      return CheckCircle2;
    case "database-zap":
      return DatabaseZap;
    case "gauge":
      return Gauge;
    case "key":
      return KeyRound;
    case "mail-check":
      return MailCheck;
    case "shield-alert":
      return ShieldAlert;
    default:
      return ShieldCheck;
  }
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function DmarkDashboard({
  initialDashboard,
  initialAlerts,
  initialSettings,
  initialNotice = "Dashboard ready.",
}: DmarkDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabID>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dashboard, setDashboard] = useState(initialDashboard);
  const [selectedDomainID, setSelectedDomainID] = useState(initialDashboard.protectedDomains[0]?.id ?? "");
  const [recheckingDomainID, setRecheckingDomainID] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState(initialNotice);
  const [activeAlerts, setActiveAlerts] = useState(initialAlerts);
  const [settings, setSettings] = useState(initialSettings);
  const [savingSetting, setSavingSetting] = useState<SettingsKey | null>(null);
  const [reporterFilter, setReporterFilter] = useState<"all" | "unknown">("all");
  const [reporter, setReporter] = useState<ReporterViewModel | null>(null);
  const [reporterState, setReporterState] = useState<LoadState>("idle");
  const [reporterError, setReporterError] = useState("");
  const [changePlan, setChangePlan] = useState<ChangePlanViewModel | null>(null);
  const [changePlanState, setChangePlanState] = useState<LoadState>("idle");
  const [changePlanError, setChangePlanError] = useState("");

  const domains = dashboard.protectedDomains;

  const filteredDomains = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return domains;
    return domains.filter((domain) => {
      return (
        domain.domain.toLowerCase().includes(normalized) ||
        domain.owner.toLowerCase().includes(normalized) ||
        domain.nextAction.toLowerCase().includes(normalized)
      );
    });
  }, [domains, query]);

  const selectedDomain = domains.find((domain) => domain.id === selectedDomainID) ?? domains[0];

  useEffect(() => {
    if (!selectedDomain || activeTab !== "reporter") return;

    let ignore = false;

    async function loadReporter() {
      setReporterState("loading");
      setReporterError("");

      try {
        const payload = await getReporterData(selectedDomain!.id, reporterFilter === "unknown" ? "unknown" : undefined);
        if (ignore) return;
        setReporter(payload);
        setReporterState("ready");
      } catch (error) {
        if (ignore) return;
        setReporter(null);
        setReporterState("error");
        setReporterError(errorMessage(error, "Reporter data could not be loaded."));
      }
    }

    void loadReporter();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, reporterFilter]);

  useEffect(() => {
    if (!selectedDomain || (activeTab !== "domains" && activeTab !== "overview")) return;

    let ignore = false;

    async function loadChangePlan() {
      setChangePlanState("loading");
      setChangePlanError("");

      try {
        const payload = await getChangePlan(selectedDomain!.id);
        if (ignore) return;
        setChangePlan(payload);
        setChangePlanState("ready");
      } catch (error) {
        if (ignore) return;
        setChangePlan(null);
        setChangePlanState("error");
        setChangePlanError(errorMessage(error, "Change plan could not be loaded."));
      }
    }

    void loadChangePlan();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain]);

  function announce(message: string) {
    setActionNotice(message);
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      announce(`${label} copied.`);
    } catch {
      announce(`Could not copy ${label.toLowerCase()}.`);
    }
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    announce(`${filename} exported.`);
  }

  function exportDomains(rows: ProtectedDomain[]) {
    const csv = [
      ["domain", "owner", "status", "score", "dmarc_policy", "spf_lookups", "dkim_coverage", "unknown_senders", "last_checked"],
      ...rows.map((domain) => [
        domain.domain,
        domain.owner,
        domain.status,
        `${domain.score}`,
        domain.dmarcPolicy,
        `${domain.spfLookups}`,
        `${domain.dkimCoverage}`,
        `${domain.unknownSenders}`,
        domain.lastChecked,
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    downloadBlob("dmark-domains.csv", new Blob([csv], { type: "text/csv" }));
  }

  async function recheckDomain(domain: ProtectedDomain) {
    setRecheckingDomainID(domain.id);
    announce(`Rechecking ${domain.domain}...`);

    try {
      const result = await recheckDashboardDomain(domain.id);
      const refreshed = await getDashboardData().catch(() => null);
      if (refreshed) setDashboard(refreshed);
      announce(`${domain.domain} recheck ${result.status}.`);
    } catch (error) {
      announce(errorMessage(error, `${domain.domain} recheck failed.`));
    } finally {
      setRecheckingDomainID(null);
    }
  }

  async function resolveAlert(alertID: string, action: "acknowledged" | "muted") {
    const alert = activeAlerts.find((item) => item.id === alertID);

    try {
      if (action === "acknowledged") {
        await acknowledgeDashboardAlert(alertID, "Acknowledged from dashboard.");
      } else {
        await muteDashboardAlert(alertID, "7d", "Muted from dashboard.");
      }
      setActiveAlerts((current) => current.filter((item) => item.id !== alertID));
      announce(`${alert?.title || "Alert"} ${action}.`);
    } catch (error) {
      announce(errorMessage(error, `${alert?.title || "Alert"} could not be ${action}.`));
    }
  }

  async function toggleSetting(key: SettingsKey) {
    const next = { ...settings, [key]: !settings[key] };
    const previous = settings;
    setSettings(next);
    setSavingSetting(key);

    try {
      const saved = await saveDashboardSettings(next);
      setSettings(saved);
      announce("Automation setting saved.");
    } catch (error) {
      setSettings(previous);
      announce(errorMessage(error, "Settings could not be saved."));
    } finally {
      setSavingSetting(null);
    }
  }

  async function exportReporterCSV() {
    if (!selectedDomain) return;

    try {
      const blob = await fetchReporterCSV(selectedDomain.id, reporterFilter === "unknown" ? "unknown" : undefined);
      downloadBlob("dmark-reporter-senders.csv", blob);
    } catch (error) {
      announce(errorMessage(error, "Reporter CSV could not be exported."));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-navy">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <DashboardSidebar activeTab={activeTab} onSelect={setActiveTab} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-trust">
                  Dmark command center
                </p>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Domain trust dashboard</h1>
              </div>
            </div>

            <label className="hidden min-w-80 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 md:flex">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search domains, owners, next actions"
                className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </label>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="hidden min-h-10 items-center justify-center rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust sm:inline-flex"
              >
                Marketing
              </Link>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover"
                onClick={() => announce("Domain onboarding is managed in the backend app.")}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add domain
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <label className="mb-5 flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3 md:hidden">
            <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search domains"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          {activeTab === "overview" ? (
            <OverviewTab
              dashboard={dashboard}
              selectedDomain={selectedDomain}
              filteredDomains={filteredDomains}
              onSelectDomain={setSelectedDomainID}
              onOpenTab={setActiveTab}
              onRecheckDomain={recheckDomain}
              recheckingDomainID={recheckingDomainID}
            />
          ) : null}
          {activeTab === "domains" ? (
            <DomainsTab
              domains={filteredDomains}
              selectedDomainID={selectedDomain?.id ?? ""}
              selectedDomain={selectedDomain}
              changePlan={changePlan}
              changePlanState={changePlanState}
              changePlanError={changePlanError}
              onSelectDomain={setSelectedDomainID}
              onRecheckDomain={recheckDomain}
              onExportDomains={exportDomains}
              onCopy={copyText}
              recheckingDomainID={recheckingDomainID}
            />
          ) : null}
          {activeTab === "reporter" ? (
            <ReporterTab
              selectedDomain={selectedDomain}
              reporter={reporter}
              reporterState={reporterState}
              reporterError={reporterError}
              sourceFilter={reporterFilter}
              onToggleFilter={() => {
                const next = reporterFilter === "all" ? "unknown" : "all";
                setReporterFilter(next);
                announce(next === "unknown" ? "Showing unknown senders only." : "Showing all senders.");
              }}
              onExport={exportReporterCSV}
            />
          ) : null}
          {activeTab === "alerts" ? (
            <AlertsTab alerts={activeAlerts} onOpenDomains={() => setActiveTab("domains")} onResolveAlert={resolveAlert} />
          ) : null}
          {activeTab === "settings" ? (
            <SettingsTab settings={settings} savingSetting={savingSetting} onToggle={toggleSetting} />
          ) : null}
        </main>
      </div>

      <div
        className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded-md border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-navy shadow-lg"
        role="status"
        aria-live="polite"
      >
        {actionNotice}
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/50"
            aria-label="Close navigation"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-80 max-w-[86vw] bg-white shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600"
              onClick={() => setMobileNavOpen(false)}
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <DashboardSidebar
              activeTab={activeTab}
              onSelect={(tab) => {
                setActiveTab(tab);
                setMobileNavOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DashboardSidebar({ activeTab, onSelect }: { activeTab: TabID; onSelect: (tab: TabID) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-6">
        <Link href="/" className="flex items-center gap-3" aria-label="dmark.is home">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-navy text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight">dmark.is</span>
            <span className="block font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted">
              Trust operations
            </span>
          </span>
        </Link>
      </div>
      <nav className="grid gap-1 p-4" aria-label="Dashboard navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                active ? "bg-blue-50 text-trust" : "text-slate-600 hover:bg-slate-50 hover:text-navy"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200 p-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Sparkles className="h-5 w-5 text-trust" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-navy">Backend-backed operations</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Dashboard actions are proxied through server routes with no browser-visible backend token.
          </p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  dashboard,
  selectedDomain,
  filteredDomains,
  onSelectDomain,
  onOpenTab,
  onRecheckDomain,
  recheckingDomainID,
}: {
  dashboard: DashboardViewModel;
  selectedDomain?: ProtectedDomain;
  filteredDomains: ProtectedDomain[];
  onSelectDomain: (id: string) => void;
  onOpenTab: (tab: TabID) => void;
  onRecheckDomain: (domain: ProtectedDomain) => void;
  recheckingDomainID: string | null;
}) {
  if (!selectedDomain) {
    return (
      <EmptyState
        icon={Globe2}
        title="No protected domains"
        detail="Add domains in the backend app, then refresh this dashboard to load live posture and Reporter data."
      />
    );
  }

  return (
    <div className="grid gap-6">
      <CommandCenter
        selectedDomain={selectedDomain}
        onOpenReporter={() => onOpenTab("reporter")}
        onRecheckDomain={onRecheckDomain}
        recheckingDomainID={recheckingDomainID}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboard.metrics.map((metric) => {
          const Icon = dashboardIcon(metric.icon);
          return (
            <article key={metric.label} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-semibold tracking-tight text-navy">{metric.value}</p>
                </div>
                <span className={`grid h-10 w-10 place-items-center rounded-md border ${metricTone(metric.tone)}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-sm text-slate-600">{metric.detail}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                {metric.trend}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fleet health
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy">Live backend posture</h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenTab("reporter")}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
            >
              Reporter detail
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-6 grid gap-3">
            {filteredDomains.slice(0, 5).map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => onSelectDomain(domain.id)}
                className={`flex min-h-14 items-center justify-between gap-4 rounded-md border px-4 text-left transition ${
                  selectedDomain.id === domain.id
                    ? "border-trust bg-blue-50 text-trust"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{domain.domain}</span>
                  <span className="mt-1 block text-xs text-slate-500">{domain.nextAction}</span>
                </span>
                <span className="font-mono text-sm font-semibold">{domain.score}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Focus domain
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy">{selectedDomain.domain}</h2>
            </div>
            <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${statusTone(selectedDomain.status)}`}>
              {formatStatus(selectedDomain.status)}
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <CompactStat label="Score" value={`${selectedDomain.score}`} />
            <CompactStat label="DMARC" value={`p=${selectedDomain.dmarcPolicy}`} />
            <CompactStat label="SPF lookups" value={`${selectedDomain.spfLookups}`} />
            <CompactStat label="Alignment" value={`${selectedDomain.alignmentRate}%`} />
          </div>
          <p className="mt-5 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            {selectedDomain.nextAction}
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <RecommendationsPanel dashboard={dashboard} />
        <ActivityPanel dashboard={dashboard} />
      </section>
    </div>
  );
}

function CommandCenter({
  selectedDomain,
  onOpenReporter,
  onRecheckDomain,
  recheckingDomainID,
}: {
  selectedDomain: ProtectedDomain;
  onOpenReporter: () => void;
  onRecheckDomain: (domain: ProtectedDomain) => void;
  recheckingDomainID: string | null;
}) {
  const isRechecking = recheckingDomainID === selectedDomain.id;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-trust">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Operator view
            </span>
            <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${statusTone(selectedDomain.status)}`}>
              {formatStatus(selectedDomain.status)}
            </span>
          </div>
          <div className="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight text-navy">{selectedDomain.domain}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{selectedDomain.nextAction}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onRecheckDomain(selectedDomain)}
                disabled={isRechecking}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${isRechecking ? "animate-spin" : ""}`} aria-hidden="true" />
                {isRechecking ? "Checking..." : "Recheck DNS"}
              </button>
              <button
                type="button"
                onClick={onOpenReporter}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Reports
              </button>
            </div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <CompactStat label="Trust score" value={`${selectedDomain.score}`} detail="Weighted DNS posture" />
            <CompactStat label="Alignment" value={`${selectedDomain.alignmentRate}%`} detail="Last reporting window" />
            <CompactStat label="Unknown senders" value={`${selectedDomain.unknownSenders}`} detail="Needs classification" />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Enforcement ladder
          </p>
          <div className="mt-5 grid gap-3">
            {["none", "quarantine", "reject"].map((policy, index) => {
              const active =
                selectedDomain.dmarcPolicy === policy ||
                (selectedDomain.dmarcPolicy === "reject" && policy !== "reject") ||
                (selectedDomain.dmarcPolicy === "quarantine" && policy === "none");
              return (
                <div key={policy} className="flex items-center gap-3">
                  <span
                    className={`grid h-9 w-9 place-items-center rounded-md border text-sm font-semibold ${
                      active ? "border-trust bg-blue-50 text-trust" : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-navy">{policy}</p>
                    <p className="font-mono text-xs text-slate-500">p={policy}</p>
                  </div>
                  {active ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function DomainsTab({
  domains,
  selectedDomainID,
  selectedDomain,
  changePlan,
  changePlanState,
  changePlanError,
  onSelectDomain,
  onRecheckDomain,
  onExportDomains,
  onCopy,
  recheckingDomainID,
}: {
  domains: ProtectedDomain[];
  selectedDomainID: string;
  selectedDomain?: ProtectedDomain;
  changePlan: ChangePlanViewModel | null;
  changePlanState: LoadState;
  changePlanError: string;
  onSelectDomain: (id: string) => void;
  onRecheckDomain: (domain: ProtectedDomain) => void;
  onExportDomains: (domains: ProtectedDomain[]) => void;
  onCopy: (value: string, label: string) => void;
  recheckingDomainID: string | null;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-trust">Protected domains</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy">Record monitoring and remediation</h2>
        </div>
        <button
          type="button"
          onClick={() => onExportDomains(domains)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export domains
        </button>
      </div>

      {domains.length ? (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <article
              key={domain.id}
              className={`rounded-lg border bg-white p-5 shadow-sm ${
                selectedDomainID === domain.id ? "border-trust ring-2 ring-blue-100" : "border-slate-200"
              }`}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-navy">{domain.domain}</h3>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(domain.status)}`}>
                      {formatStatus(domain.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {domain.owner} · checked {domain.lastChecked}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectDomain(domain.id)}
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => onRecheckDomain(domain)}
                    disabled={recheckingDomainID === domain.id}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {recheckingDomainID === domain.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Zap className="h-4 w-4" aria-hidden="true" />
                    )}
                    {recheckingDomainID === domain.id ? "Checking..." : "Recheck"}
                  </button>
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-5">
                <CompactStat label="Score" value={`${domain.score}`} />
                <CompactStat label="DMARC" value={`p=${domain.dmarcPolicy}`} />
                <CompactStat label="SPF" value={`${domain.spfLookups}/10`} />
                <CompactStat label="DKIM" value={`${domain.dkimCoverage}%`} />
                <CompactStat label="Unknown" value={`${domain.unknownSenders}`} />
              </div>
              <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                {domain.nextAction}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Globe2}
          title="No protected domains"
          detail="No domains matched the current search or the backend returned an empty protected-domain list."
        />
      )}

      <DNSChangePlan
        selectedDomain={selectedDomain}
        changePlan={changePlan}
        state={changePlanState}
        error={changePlanError}
        onCopy={onCopy}
      />
    </div>
  );
}

function DNSChangePlan({
  selectedDomain,
  changePlan,
  state,
  error,
  onCopy,
}: {
  selectedDomain?: ProtectedDomain;
  changePlan: ChangePlanViewModel | null;
  state: LoadState;
  error: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Change plan
        </p>
        <h3 className="mt-2 text-xl font-semibold text-navy">
          {selectedDomain ? `DNS records for ${selectedDomain.domain}` : "DNS records"}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Backend-generated changes replace the former hardcoded recommendation queue.
        </p>
      </div>

      {state === "loading" ? <PanelNotice text="Loading backend change plan..." /> : null}
      {state === "error" ? <PanelNotice tone="error" text={error || "Change plan unavailable."} /> : null}
      {state === "ready" && changePlan && changePlan.changes.length === 0 ? (
        <PanelNotice text={changePlan.nextAction || "No DNS changes are currently staged for this domain."} />
      ) : null}

      {changePlan?.changes.length ? (
        <div className="mt-5 grid gap-3">
          {changePlan.changes.map((change) => (
            <div
              key={change.id}
              className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center"
            >
              <div>
                <p className="text-sm font-semibold text-navy">{change.label}</p>
                <span className="mt-2 inline-flex rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {change.state}
                </span>
              </div>
              <code className="overflow-x-auto rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                {change.record}
              </code>
              <button
                type="button"
                onClick={() => onCopy(change.record, `${change.label} record`)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ReporterTab({
  selectedDomain,
  reporter,
  reporterState,
  reporterError,
  sourceFilter,
  onToggleFilter,
  onExport,
}: {
  selectedDomain?: ProtectedDomain;
  reporter: ReporterViewModel | null;
  reporterState: LoadState;
  reporterError: string;
  sourceFilter: "all" | "unknown";
  onToggleFilter: () => void;
  onExport: () => void;
}) {
  if (!selectedDomain) {
    return <EmptyState icon={BarChart3} title="Domain not found" detail="Select an existing protected domain before opening Reporter." />;
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-trust">Reporter</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy">DMARC aggregate intelligence</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Sender inventory, alignment rates, and enforcement signals for {selectedDomain.domain}.
        </p>
      </div>

      {reporterState === "loading" ? <PanelNotice text="Loading Reporter data..." /> : null}
      {reporterState === "error" ? (
        <PanelNotice tone="error" text={reporterError || "Reporter data could not be loaded."} />
      ) : null}

      {reporter ? (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            <CompactStat label="Report volume" value={reporter.reportVolume} detail="Current backend window" />
            <CompactStat label="Aligned messages" value={`${reporter.alignedPercentage}%`} detail="SPF or DKIM aligned" />
            <CompactStat label="Reporter orgs" value={`${reporter.reporterOrgCount}`} detail="Aggregate senders" />
          </section>

          {reporter.setupGuidance ? <PanelNotice text={reporter.setupGuidance} /> : null}

          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Sender inventory
                </p>
                <h3 className="mt-2 text-xl font-semibold text-navy">Top sources by message volume</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleFilter}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
                >
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  {sourceFilter === "all" ? "Unknown only" : "All senders"}
                </button>
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-soft"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Export CSV
                </button>
              </div>
            </div>
            {reporter.senderSources.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Provider</th>
                      <th className="px-5 py-3 font-semibold">Volume</th>
                      <th className="px-5 py-3 font-semibold">Aligned</th>
                      <th className="px-5 py-3 font-semibold">Classification</th>
                      <th className="px-5 py-3 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reporter.senderSources.map((source) => (
                      <tr key={source.id}>
                        <td className="px-5 py-4 font-semibold text-navy">{source.provider}</td>
                        <td className="px-5 py-4 text-slate-600">{source.volume}</td>
                        <td className="px-5 py-4 text-slate-600">{source.aligned}%</td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                              source.unknown
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                            }`}
                          >
                            {source.unknown ? "Unknown" : "Expected"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{source.trend}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5">
                <PanelNotice text={reporter.setupGuidance || "Reporter is configured, but no sender inventory has been received yet."} />
              </div>
            )}
          </article>
        </>
      ) : null}
    </div>
  );
}

function AlertsTab({
  alerts,
  onOpenDomains,
  onResolveAlert,
}: {
  alerts: DashboardAlert[];
  onOpenDomains: () => void;
  onResolveAlert: (alertID: string, action: "acknowledged" | "muted") => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-trust">Alert queue</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy">Changes that need operator review</h2>
        </div>
        <button
          type="button"
          onClick={onOpenDomains}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-navy px-4 text-sm font-semibold text-white transition hover:bg-navy-soft"
        >
          Review domains
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {alerts.length ? (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <article key={alert.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${severityTone(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">{alert.age}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-navy">{alert.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-trust">{alert.domain}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{alert.detail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onResolveAlert(alert.id, "acknowledged")}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-trust px-3 text-sm font-semibold text-white transition hover:bg-trust-hover"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveAlert(alert.id, "muted")}
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
                  >
                    Mute
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CheckCircle2}
          title="No active alerts"
          detail="Acknowledged and muted alerts stay in the audit trail. New DNS drift or sender findings will reappear here."
        />
      )}
    </div>
  );
}

function SettingsTab({
  settings,
  savingSetting,
  onToggle,
}: {
  settings: SettingsState;
  savingSetting: SettingsKey | null;
  onToggle: (key: SettingsKey) => void;
}) {
  return (
    <div className="grid gap-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-trust">Settings</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy">Automation and notification controls</h2>
      </div>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Enforcement guardrails
              </p>
              <h3 className="mt-2 text-xl font-semibold text-navy">DMARC rollout policy</h3>
            </div>
            <Gauge className="h-5 w-5 text-trust" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-4">
            <SettingRow
              title="Require 95% alignment before p=reject"
              enabled={settings.alignmentGate}
              saving={savingSetting === "alignmentGate"}
              onToggle={() => onToggle("alignmentGate")}
            />
            <SettingRow
              title="Pause automation when unknown senders spike"
              enabled={settings.pauseOnUnknownSpike}
              saving={savingSetting === "pauseOnUnknownSpike"}
              onToggle={() => onToggle("pauseOnUnknownSpike")}
            />
            <SettingRow
              title="Auto-generate monthly executive reports"
              enabled={settings.monthlyReports}
              saving={savingSetting === "monthlyReports"}
              onToggle={() => onToggle("monthlyReports")}
            />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Notification channels
              </p>
              <h3 className="mt-2 text-xl font-semibold text-navy">Backend channels</h3>
            </div>
            <Bell className="h-5 w-5 text-trust" aria-hidden="true" />
          </div>
          {settings.notificationChannels.length ? (
            <div className="mt-6 grid gap-3">
              {settings.notificationChannels.map((channel) => (
                <div
                  key={channel}
                  className="flex min-h-16 items-center justify-between gap-4 rounded-md border border-slate-200 px-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600">
                      <Bell className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <p className="text-sm font-semibold capitalize text-navy">{channel}</p>
                  </div>
                  <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    On
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <PanelNotice text="No notification channels are configured in dashboard settings." />
          )}
        </article>
      </section>
    </div>
  );
}

function RecommendationsPanel({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Remediation queue
        </p>
        <h2 className="mt-2 text-xl font-semibold text-navy">Recommended next actions</h2>
      </div>
      {dashboard.recommendations.length ? (
        <div className="mt-5 grid gap-3">
          {dashboard.recommendations.map((item) => (
            <div key={item.id} className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <h3 className="text-sm font-semibold text-navy">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-trust">{item.domain}</p>
                </div>
                <span className="w-fit rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {item.due}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{item.impact}</p>
              <p className="mt-3 text-xs font-semibold text-slate-500">Effort: {item.effort}</p>
            </div>
          ))}
        </div>
      ) : (
        <PanelNotice text="No remediation recommendations are available for the current domain set." />
      )}
    </article>
  );
}

function ActivityPanel({ dashboard }: { dashboard: DashboardViewModel }) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Audit trail
        </p>
        <h2 className="mt-2 text-xl font-semibold text-navy">Recent activity</h2>
      </div>
      <div className="mt-5 grid gap-4">
        {dashboard.activityEvents.map((event) => {
          const Icon = dashboardIcon(event.icon);
          return (
            <div key={`${event.title}-${event.time}`} className="flex gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-slate-100 text-slate-600">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-navy">{event.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{event.detail}</p>
                <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-slate-400">{event.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function SettingRow({
  title,
  enabled,
  saving,
  onToggle,
}: {
  title: string;
  enabled: boolean;
  saving: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={saving}
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded-md border border-slate-200 px-4 text-left transition hover:border-trust disabled:cursor-not-allowed disabled:opacity-70"
      aria-pressed={enabled}
    >
      <p className="text-sm font-semibold text-navy">{title}</p>
      <span
        className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-trust" : "bg-slate-300"}`}
        aria-hidden="true"
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${enabled ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function CompactStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-navy">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Icon className="mx-auto h-8 w-8 text-trust" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-semibold text-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

function PanelNotice({ text, tone = "info" }: { text: string; tone?: "info" | "error" }) {
  return (
    <p
      className={`mt-4 rounded-md border px-4 py-3 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      {text}
    </p>
  );
}
