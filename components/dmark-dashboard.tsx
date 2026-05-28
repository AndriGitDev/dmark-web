"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  Filter,
  FileText,
  Gauge,
  Globe2,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  ShieldCheck,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import {
  activityEvents,
  dashboardAlerts,
  dashboardMetrics,
  notificationChannels,
  protectedDomains,
  recommendations,
  senderSources,
  type AlertSeverity,
  type DomainStatus,
  type ProtectedDomain,
} from "@/lib/dashboard";

const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "domains", label: "Domains", icon: Globe2 },
  { id: "reporter", label: "Reporter", icon: BarChart3 },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

type TabID = (typeof navItems)[number]["id"];

const scoreBands = [
  { label: "Mon", value: 76 },
  { label: "Tue", value: 81 },
  { label: "Wed", value: 79 },
  { label: "Thu", value: 84 },
  { label: "Fri", value: 88 },
  { label: "Sat", value: 90 },
  { label: "Sun", value: 92 },
];

const dnsChangePlan = [
  {
    label: "SPF flatten",
    record: "v=spf1 include:_dmark.northwind.is include:spf.protection.outlook.com -all",
    state: "Ready",
  },
  {
    label: "DMARC quarantine",
    record: "v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@northwind.is",
    state: "Review",
  },
  {
    label: "DKIM selector",
    record: "selector1._domainkey CNAME selector1-northwind-is._domainkey.tenant.onmicrosoft.com",
    state: "Waiting",
  },
];

const policySteps = [
  { label: "Monitor", policy: "p=none", active: true },
  { label: "Quarantine", policy: "pct=25", active: true },
  { label: "Reject", policy: "p=reject", active: false },
];

const reporterBars = [
  { label: "Microsoft 365", value: 99, color: "bg-emerald-500" },
  { label: "Google", value: 98, color: "bg-blue-500" },
  { label: "Sendgrid", value: 92, color: "bg-amber-500" },
  { label: "Unknown ASN", value: 42, color: "bg-red-500" },
];

function metricTone(tone: string) {
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

export function DmarkDashboard() {
  const [activeTab, setActiveTab] = useState<TabID>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedDomainID, setSelectedDomainID] = useState(protectedDomains[0]?.id ?? "");

  const filteredDomains = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return protectedDomains;
    return protectedDomains.filter((domain) => {
      return (
        domain.domain.toLowerCase().includes(normalized) ||
        domain.owner.toLowerCase().includes(normalized) ||
        domain.nextAction.toLowerCase().includes(normalized)
      );
    });
  }, [query]);

  const selectedDomain =
    protectedDomains.find((domain) => domain.id === selectedDomainID) ?? protectedDomains[0];

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

            <div className="hidden min-w-80 items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 md:flex">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search domains, owners, next actions"
                className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
              />
            </div>

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
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add domain
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="md:hidden">
            <label className="flex min-h-11 items-center gap-3 rounded-md border border-slate-200 bg-white px-3">
              <Search className="h-4 w-4 text-slate-400" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search domains"
                className="w-full bg-transparent text-sm outline-none"
              />
            </label>
          </div>

          {activeTab === "overview" ? (
            <OverviewTab
              selectedDomain={selectedDomain}
              filteredDomains={filteredDomains}
              onSelectDomain={setSelectedDomainID}
              onOpenTab={setActiveTab}
            />
          ) : null}
          {activeTab === "domains" ? (
            <DomainsTab
              domains={filteredDomains}
              selectedDomainID={selectedDomain.id}
              onSelectDomain={setSelectedDomainID}
            />
          ) : null}
          {activeTab === "reporter" ? <ReporterTab selectedDomain={selectedDomain} /> : null}
          {activeTab === "alerts" ? <AlertsTab onOpenDomains={() => setActiveTab("domains")} /> : null}
          {activeTab === "settings" ? <SettingsTab /> : null}
        </main>
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
          <p className="mt-3 text-sm font-semibold text-navy">Enforcement readiness</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            4 domains can move toward stricter DMARC policies this week.
          </p>
        </div>
      </div>
    </div>
  );
}

function OverviewTab({
  selectedDomain,
  filteredDomains,
  onSelectDomain,
  onOpenTab,
}: {
  selectedDomain: ProtectedDomain;
  filteredDomains: ProtectedDomain[];
  onSelectDomain: (id: string) => void;
  onOpenTab: (tab: TabID) => void;
}) {
  return (
    <div className="grid gap-6">
      <CommandCenter selectedDomain={selectedDomain} onOpenReporter={() => onOpenTab("reporter")} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardMetrics.map((metric) => {
          const Icon = metric.icon;
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

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fleet health
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy">Trust posture is improving</h2>
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
          <div className="mt-6 flex h-64 items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
            {scoreBands.map((band) => (
              <div key={band.label} className="flex h-full flex-1 flex-col justify-end gap-2">
                <div className="flex min-h-40 items-end rounded-md bg-white px-2 py-2">
                  <div
                    className="w-full rounded-md bg-trust transition-all"
                    style={{ height: `${band.value}%` }}
                    aria-label={`${band.label} posture ${band.value}%`}
                  />
                </div>
                <p className="text-center font-mono text-[0.68rem] uppercase tracking-[0.12em] text-slate-500">
                  {band.label}
                </p>
              </div>
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
          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-navy">Next action</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDomain.nextAction}</p>
          </div>
          <div className="mt-5 grid gap-2">
            {filteredDomains.slice(0, 4).map((domain) => (
              <button
                key={domain.id}
                type="button"
                onClick={() => onSelectDomain(domain.id)}
                className={`flex min-h-11 items-center justify-between rounded-md border px-3 text-left text-sm transition ${
                  selectedDomain.id === domain.id
                    ? "border-trust bg-blue-50 text-trust"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="font-semibold">{domain.domain}</span>
                <span className="font-mono text-xs">{domain.score}</span>
              </button>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <RecommendationsPanel />
        <ActivityPanel />
      </section>
    </div>
  );
}

function CommandCenter({
  selectedDomain,
  onOpenReporter,
}: {
  selectedDomain: ProtectedDomain;
  onOpenReporter: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_420px]">
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
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Recheck DNS
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
            <CompactStat label="Alignment" value={`${selectedDomain.alignmentRate}%`} detail="Last 7 days" />
            <CompactStat label="Unknown senders" value={`${selectedDomain.unknownSenders}`} detail="Needs classification" />
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 p-5 lg:border-l lg:border-t-0">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Enforcement ladder
          </p>
          <div className="mt-5 grid gap-3">
            {policySteps.map((step, index) => (
              <div key={step.label} className="flex items-center gap-3">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-md border text-sm font-semibold ${
                    step.active ? "border-trust bg-blue-50 text-trust" : "border-slate-200 bg-white text-slate-400"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy">{step.label}</p>
                  <p className="font-mono text-xs text-slate-500">{step.policy}</p>
                </div>
                {step.active ? <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DomainsTab({
  domains,
  selectedDomainID,
  onSelectDomain,
}: {
  domains: ProtectedDomain[];
  selectedDomainID: string;
  onSelectDomain: (id: string) => void;
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
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Protect domain
        </button>
      </div>

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
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft"
                >
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  Recheck
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

      <DNSChangePlan />
    </div>
  );
}

function DNSChangePlan() {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Change plan
          </p>
          <h3 className="mt-2 text-xl font-semibold text-navy">DNS records ready for approval</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Staged changes are written as provider-safe records before anyone touches production DNS.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export
        </button>
      </div>
      <div className="mt-5 grid gap-3">
        {dnsChangePlan.map((change) => (
          <div key={change.label} className="grid gap-3 rounded-md border border-slate-200 bg-slate-50 p-4 lg:grid-cols-[180px_1fr_auto] lg:items-center">
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
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft"
            >
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy
            </button>
          </div>
        ))}
      </div>
    </article>
  );
}

function ReporterTab({ selectedDomain }: { selectedDomain: ProtectedDomain }) {
  return (
    <div className="grid gap-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-trust">Reporter</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy">DMARC aggregate intelligence</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          The dashboard turns report XML into sender inventory, alignment rates, and enforcement decisions for{" "}
          {selectedDomain.domain}.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <CompactStat label="Report volume" value="1.8M" detail="Last 7 days" />
        <CompactStat label="Aligned messages" value="96.4%" detail="SPF or DKIM aligned" />
        <CompactStat label="Reporter orgs" value="14" detail="Google, Yahoo, Microsoft and more" />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Alignment by source
              </p>
              <h3 className="mt-2 text-xl font-semibold text-navy">Where trust is drifting</h3>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-trust hover:text-trust"
              aria-label="Filter sources"
            >
              <Filter className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="mt-5 grid gap-4">
            {reporterBars.map((bar) => (
              <div key={bar.label}>
                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="font-semibold text-navy">{bar.label}</span>
                  <span className="font-mono text-xs text-slate-500">{bar.value}%</span>
                </div>
                <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${bar.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Report controls
              </p>
              <h3 className="mt-2 text-xl font-semibold text-navy">Executive packet</h3>
            </div>
            <SlidersHorizontal className="h-5 w-5 text-trust" aria-hidden="true" />
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <CompactStat label="Window" value="7d" detail="Rolling import" />
            <CompactStat label="Failures" value="64k" detail="Needs owner" />
            <CompactStat label="Ready" value="4" detail="p=reject candidates" />
          </div>
          <p className="mt-4 rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
            Package the sender inventory, DMARC progression, and DNS change plan into one approval-ready report.
          </p>
        </article>
      </section>

      <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Sender inventory
            </p>
            <h3 className="mt-2 text-xl font-semibold text-navy">Top sources by message volume</h3>
          </div>
          <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust">
            <FileText className="h-4 w-4" aria-hidden="true" />
            Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[720px] w-full text-left text-sm">
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
              {senderSources.map((source) => (
                <tr key={source.provider}>
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
      </article>
    </div>
  );
}

function AlertsTab({ onOpenDomains }: { onOpenDomains: () => void }) {
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

      <div className="grid gap-4">
        {dashboardAlerts.map((alert) => (
          <article key={alert.id} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${severityTone(alert.severity)}`}>
                    {alert.severity}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    {alert.age}
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-navy">{alert.title}</h3>
                <p className="mt-2 text-sm font-semibold text-trust">{alert.domain}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{alert.detail}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-trust px-3 text-sm font-semibold text-white transition hover:bg-trust-hover">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Acknowledge
                </button>
                <button className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust">
                  Mute
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function SettingsTab() {
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
            <SettingRow title="Require 95% alignment before p=reject" enabled />
            <SettingRow title="Pause automation when unknown senders spike" enabled />
            <SettingRow title="Auto-generate monthly executive reports" enabled={false} />
          </div>
        </article>

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Notification channels
              </p>
              <h3 className="mt-2 text-xl font-semibold text-navy">Where alerts go</h3>
            </div>
            <Bell className="h-5 w-5 text-trust" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-3">
            {notificationChannels.map((channel) => {
              const Icon = channel.icon;
              return (
                <div
                  key={channel.name}
                  className="flex min-h-16 items-center justify-between gap-4 rounded-md border border-slate-200 px-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">{channel.name}</p>
                      <p className="text-xs text-slate-500">{channel.target}</p>
                    </div>
                  </div>
                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                      channel.active
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    {channel.active ? "On" : "Off"}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}

function RecommendationsPanel() {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Remediation queue
          </p>
          <h2 className="mt-2 text-xl font-semibold text-navy">Recommended next actions</h2>
        </div>
        <ChevronDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
      </div>
      <div className="mt-5 grid gap-3">
        {recommendations.map((item) => (
          <div key={`${item.domain}-${item.title}`} className="rounded-md border border-slate-200 p-4">
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
    </article>
  );
}

function ActivityPanel() {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Audit trail
        </p>
        <h2 className="mt-2 text-xl font-semibold text-navy">Recent activity</h2>
      </div>
      <div className="mt-5 grid gap-4">
        {activityEvents.map((event) => {
          const Icon = event.icon;
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

function SettingRow({ title, enabled }: { title: string; enabled: boolean }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 rounded-md border border-slate-200 px-4">
      <p className="text-sm font-semibold text-navy">{title}</p>
      <span
        className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-trust" : "bg-slate-300"}`}
        aria-label={enabled ? "Enabled" : "Disabled"}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </span>
    </div>
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
