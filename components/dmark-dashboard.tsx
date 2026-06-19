"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { motion } from "framer-motion";
import { Menu, Plus, RefreshCw, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import {
  acknowledgeDashboardAlert,
  createDashboardDomain,
  fetchReporterCSV,
  getBrandRiskData,
  getChangePlan,
  getDashboardData,
  getDNSGuidanceData,
  getPlanData,
  getReporterData,
  getSPFRouteData,
  getSPFRouteHistory,
  getTrendsData,
  muteDashboardAlert,
  recheckDashboardDomain,
  saveDashboardSettings,
  saveSPFRouteSources,
  syncSPFRoute,
  type BrandRiskViewModel,
  type ChangePlanViewModel,
  type DashboardAlert,
  type DashboardViewModel,
  type DNSGuidanceViewModel,
  type PlanViewModel,
  type ProtectedDomain,
  type ReporterViewModel,
  type SettingsState,
  type SPFRouteHistoryViewModel,
  type SPFRouteSource,
  type SPFRouteViewModel,
  type TrendsViewModel,
} from "@/lib/dashboard";
import { isDashboardSessionExpiredError } from "@/lib/dashboard";
import { trackPrivacyEvent } from "@/lib/privacy-events";
import { DashboardSidebar, type TabID } from "./dashboard/sidebar";
import { OverviewTab } from "./dashboard/overview-tab";
import { DomainsTab } from "./dashboard/domains-tab";
import { ReporterTab } from "./dashboard/reporter-tab";
import { BrandRiskTab } from "./dashboard/brand-risk-tab";
import { AlertsTab } from "./dashboard/alerts-tab";
import { SettingsTab } from "./dashboard/settings-tab";
import type { LoadState, NotificationChannel, SettingsKey } from "./dashboard/types";

type DmarkDashboardProps = {
  initialDashboard: DashboardViewModel;
  initialAlerts: DashboardAlert[];
  initialSettings: SettingsState;
  initialNotice?: string;
};

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function privacyStatusForOutcome(outcome: "start" | "success" | "error") {
  if (outcome === "success") return "PASS";
  if (outcome === "error") return "ERROR";
  return "WARNING";
}

export function DmarkDashboard({
  initialDashboard,
  initialAlerts,
  initialSettings,
  initialNotice = "Dashboard ready.",
}: DmarkDashboardProps) {
  const t = useTranslations("Dashboard");
  const tc = useTranslations("Common");

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
  const [spfRoute, setSpfRoute] = useState<SPFRouteViewModel | null>(null);
  const [spfRouteState, setSpfRouteState] = useState<LoadState>("idle");
  const [spfRouteError, setSpfRouteError] = useState("");
  const [dnsGuidance, setDNSGuidance] = useState<DNSGuidanceViewModel | null>(null);
  const [dnsGuidanceState, setDNSGuidanceState] = useState<LoadState>("idle");
  const [dnsGuidanceError, setDNSGuidanceError] = useState("");
  const [syncingSPFRoute, setSyncingSPFRoute] = useState(false);
  const [savingSPFRouteSources, setSavingSPFRouteSources] = useState(false);
  const [brandRisk, setBrandRisk] = useState<BrandRiskViewModel | null>(null);
  const [brandRiskState, setBrandRiskState] = useState<LoadState>("idle");
  const [brandRiskError, setBrandRiskError] = useState("");
  const [includeInactiveBrandRisk, setIncludeInactiveBrandRisk] = useState(false);
  const [savingSettingsForm, setSavingSettingsForm] = useState(false);
  const [settingsError, setSettingsError] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [addDomainError, setAddDomainError] = useState("");
  const [trends, setTrends] = useState<TrendsViewModel | null>(null);
  const [trendsState, setTrendsState] = useState<LoadState>("idle");
  const [spfRouteHistory, setSpfRouteHistory] = useState<SPFRouteHistoryViewModel | null>(null);
  const [spfRouteHistoryState, setSpfRouteHistoryState] = useState<LoadState>("idle");
  const [plan, setPlan] = useState<PlanViewModel | null>(null);
  const [planState, setPlanState] = useState<LoadState>("idle");
  const [sessionExpired, setSessionExpired] = useState(false);
  const [reloadNonce, setReloadNonce] = useState(0);

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
        noteDashboardError(error);
        setReporter(null);
        setReporterState("error");
        setReporterError(errorMessage(error, t("errors.reporter")));
      }
    }

    void loadReporter();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, reporterFilter, reloadNonce, t]);

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
        noteDashboardError(error);
        setChangePlan(null);
        setChangePlanState("error");
        setChangePlanError(errorMessage(error, t("errors.changePlan")));
      }
    }

    void loadChangePlan();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, reloadNonce, t]);

  useEffect(() => {
    if (!selectedDomain || (activeTab !== "domains" && activeTab !== "overview")) return;

    let ignore = false;

    async function loadSPFRoute() {
      setSpfRouteState("loading");
      setSpfRouteError("");

      try {
        const payload = await getSPFRouteData(selectedDomain!.id);
        if (ignore) return;
        setSpfRoute(payload);
        setSpfRouteState("ready");
      } catch (error) {
        if (ignore) return;
        noteDashboardError(error);
        setSpfRoute(null);
        setSpfRouteState("error");
        setSpfRouteError(errorMessage(error, t("errors.spfRoute")));
      }
    }

    void loadSPFRoute();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, reloadNonce, t]);

  useEffect(() => {
    if (!selectedDomain || (activeTab !== "domains" && activeTab !== "overview")) return;

    let ignore = false;

    async function loadDNSGuidance() {
      setDNSGuidanceState("loading");
      setDNSGuidanceError("");

      try {
        const payload = await getDNSGuidanceData(selectedDomain!.id);
        if (ignore) return;
        setDNSGuidance(payload);
        setDNSGuidanceState("ready");
      } catch (error) {
        if (ignore) return;
        noteDashboardError(error);
        setDNSGuidance(null);
        setDNSGuidanceState("error");
        setDNSGuidanceError(errorMessage(error, t("errors.dnsGuidance")));
      }
    }

    void loadDNSGuidance();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, reloadNonce, t]);

  useEffect(() => {
    if (!selectedDomain || activeTab !== "brand-risk") return;

    let ignore = false;

    async function loadBrandRisk() {
      setBrandRiskState("loading");
      setBrandRiskError("");

      try {
        const payload = await getBrandRiskData(selectedDomain!.id, { tld: "is", limit: 25, includeInactive: includeInactiveBrandRisk });
        if (ignore) return;
        setBrandRisk(payload);
        setBrandRiskState("ready");
      } catch (error) {
        if (ignore) return;
        noteDashboardError(error);
        setBrandRisk(null);
        setBrandRiskState("error");
        setBrandRiskError(errorMessage(error, t("errors.brandRisk")));
      }
    }

    void loadBrandRisk();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, includeInactiveBrandRisk, reloadNonce, t]);

  useEffect(() => {
    if (!selectedDomain || activeTab !== "overview") return;

    let ignore = false;

    async function loadTrends() {
      setTrendsState("loading");

      try {
        const payload = await getTrendsData(selectedDomain!.id, 30);
        if (ignore) return;
        setTrends(payload);
        setTrendsState("ready");
      } catch (error) {
        if (ignore) return;
        noteDashboardError(error);
        setTrends(null);
        setTrendsState("error");
      }
    }

    void loadTrends();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, reloadNonce]);

  useEffect(() => {
    if (!selectedDomain || activeTab !== "domains") return;

    let ignore = false;

    async function loadSPFRouteHistory() {
      setSpfRouteHistoryState("loading");

      try {
        const payload = await getSPFRouteHistory(selectedDomain!.id);
        if (ignore) return;
        setSpfRouteHistory(payload);
        setSpfRouteHistoryState("ready");
      } catch (error) {
        if (ignore) return;
        noteDashboardError(error);
        setSpfRouteHistory(null);
        setSpfRouteHistoryState("error");
      }
    }

    void loadSPFRouteHistory();

    return () => {
      ignore = true;
    };
  }, [activeTab, selectedDomain, reloadNonce]);

  useEffect(() => {
    if (activeTab !== "settings") return;

    let ignore = false;

    async function loadPlan() {
      setPlanState("loading");

      try {
        const payload = await getPlanData();
        if (ignore) return;
        setPlan(payload);
        setPlanState("ready");
      } catch (error) {
        if (ignore) return;
        noteDashboardError(error);
        setPlan(null);
        setPlanState("error");
      }
    }

    void loadPlan();

    return () => {
      ignore = true;
    };
  }, [activeTab, reloadNonce]);

  function focusAddDomainForm() {
    const input = document.getElementById("new-domain-mobile") || document.getElementById("new-domain");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => (input as HTMLInputElement | null)?.focus(), 300);
  }

  function retryPanelLoads() {
    setReloadNonce((nonce) => nonce + 1);
  }

  function noteDashboardError(error: unknown) {
    if (isDashboardSessionExpiredError(error)) setSessionExpired(true);
  }

  function announce(message: string) {
    setActionNotice(message);
  }

  async function addDomain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const domain = newDomain.trim();
    if (!domain) {
      setAddDomainError(t("forms.addDomain.errorEmpty"));
      return;
    }

    setAddingDomain(true);
    setAddDomainError("");
    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_add_domain" });

    try {
      const created = await createDashboardDomain(domain);
      const refreshed = await getDashboardData();
      setDashboard(refreshed);
      setSelectedDomainID(created.id);
      setNewDomain("");
      setActiveTab("domains");
      announce(t("forms.addDomain.success", { domain: created.domain }));
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_add_domain" });
    } catch (error) {
      noteDashboardError(error);
      const message = errorMessage(error, t("forms.addDomain.errorFailed"));
      setAddDomainError(message);
      announce(message);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_add_domain" });
    } finally {
      setAddingDomain(false);
    }
  }

  function selectDashboardTab(tab: TabID) {
    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_nav" });
    setActiveTab(tab);
  }

  async function copyText(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      announce(t("actions.copySuccess", { label }));
    } catch {
      announce(t("actions.copyError", { label: label.toLowerCase() }));
    }
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    announce(t("actions.exportSuccess", { filename }));
  }

  function exportDomains(rows: ProtectedDomain[]) {
    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_export" });
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
    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_domain_recheck" });
    setRecheckingDomainID(domain.id);
    announce(t("actions.rechecking", { domain: domain.domain }));

    try {
      const result = await recheckDashboardDomain(domain.id);
      const refreshed = await getDashboardData().catch(() => null);
      if (refreshed) setDashboard(refreshed);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_domain_recheck" });
      announce(t("actions.recheckResult", { domain: domain.domain, status: result.status }));
    } catch (error) {
      noteDashboardError(error);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_domain_recheck" });
      announce(errorMessage(error, t("actions.recheckError", { domain: domain.domain })));
    } finally {
      setRecheckingDomainID(null);
    }
  }

  async function syncSelectedSPFRoute() {
    if (!selectedDomain) return;

    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_spf_route" });
    setSyncingSPFRoute(true);
    setSpfRouteError("");
    announce(t("actions.spfSyncing", { domain: selectedDomain.domain }));

    try {
      const result = await syncSPFRoute(selectedDomain.id);
      const refreshed = await getSPFRouteData(selectedDomain.id).catch(() => null);
      if (refreshed) setSpfRoute(refreshed);
      setSpfRouteState(refreshed ? "ready" : spfRouteState);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_spf_route" });
      announce(t("actions.spfSyncResult", { domain: selectedDomain.domain, status: result.status }));
    } catch (error) {
      noteDashboardError(error);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_spf_route" });
      const message = errorMessage(error, t("actions.spfSyncError", { domain: selectedDomain.domain }));
      setSpfRouteError(message);
      announce(message);
    } finally {
      setSyncingSPFRoute(false);
    }
  }

  async function saveSelectedSPFRouteSources(sources: SPFRouteSource[]) {
    if (!selectedDomain) return;

    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_spf_route" });
    setSavingSPFRouteSources(true);
    setSpfRouteError("");
    announce(t("actions.spfSaving", { domain: selectedDomain.domain }));

    try {
      const refreshed = await saveSPFRouteSources(selectedDomain.id, sources);
      setSpfRoute(refreshed);
      setSpfRouteState("ready");
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_spf_route" });
      announce(t("actions.spfSaveSuccess", { domain: selectedDomain.domain }));
    } catch (error) {
      noteDashboardError(error);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_spf_route" });
      const message = errorMessage(error, t("actions.spfSaveError", { domain: selectedDomain.domain }));
      setSpfRouteError(message);
      announce(message);
    } finally {
      setSavingSPFRouteSources(false);
    }
  }

  async function resolveAlert(alertID: string, action: "acknowledged" | "muted") {
    const alert = activeAlerts.find((item) => item.id === alertID);

    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_alerts" });
    try {
      if (action === "acknowledged") {
        await acknowledgeDashboardAlert(alertID, "Acknowledged from dashboard.");
      } else {
        await muteDashboardAlert(alertID, "7d", "Muted from dashboard.");
      }
      setActiveAlerts((current) => current.filter((item) => item.id !== alertID));
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_alerts" });
      announce(t("actions.alertAction", { title: alert?.title || "Alert", action }));
    } catch (error) {
      noteDashboardError(error);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_alerts" });
      announce(errorMessage(error, t("actions.alertError", { title: alert?.title || "Alert", action })));
    }
  }

  async function toggleSetting(key: SettingsKey) {
    const next = { ...settings, [key]: !settings[key] };
    const previous = settings;
    setSettings(next);
    setSavingSetting(key);
    setSettingsError("");

    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_settings" });
    try {
      const saved = await saveDashboardSettings(next);
      setSettings(saved);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_settings" });
      announce(t("actions.settingsSaved"));
    } catch (error) {
      noteDashboardError(error);
      setSettings(previous);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_settings" });
      const message = errorMessage(error, t("errors.settingsSave"));
      setSettingsError(message);
      announce(message);
    } finally {
      setSavingSetting(null);
    }
  }

  async function saveSettingsPatch(next: SettingsState) {
    const threshold = Math.round(next.alignmentThreshold);
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 100) {
      setSettingsError(t("errors.threshold"));
      announce(t("errors.threshold"));
      return;
    }

    const previous = settings;
    const normalized = { ...next, alignmentThreshold: threshold };
    setSettings(normalized);
    setSavingSettingsForm(true);
    setSettingsError("");

    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_settings" });
    try {
      const saved = await saveDashboardSettings(normalized);
      setSettings(saved);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_settings" });
      announce(t("actions.settingsSaved"));
    } catch (error) {
      noteDashboardError(error);
      const message = errorMessage(error, t("errors.settingsSave"));
      setSettings(previous);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_settings" });
      setSettingsError(message);
      announce(message);
    } finally {
      setSavingSettingsForm(false);
    }
  }

  function updateSettingsDraft(next: SettingsState) {
    setSettings(next);
    if (settingsError) setSettingsError("");
  }

  function toggleNotificationChannel(channel: NotificationChannel) {
    const channels = settings.notificationChannels.includes(channel)
      ? settings.notificationChannels.filter((item) => item !== channel)
      : [...settings.notificationChannels, channel];
    void saveSettingsPatch({ ...settings, notificationChannels: channels });
  }

  async function exportReporterCSV() {
    if (!selectedDomain) return;

    trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("start"), source: "dashboard_export" });
    try {
      const blob = await fetchReporterCSV(selectedDomain.id, reporterFilter === "unknown" ? "unknown" : undefined);
      downloadBlob("dmark-reporter-senders.csv", blob);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("success"), source: "dashboard_export" });
    } catch (error) {
      noteDashboardError(error);
      trackPrivacyEvent("dashboard_interaction", { status: privacyStatusForOutcome("error"), source: "dashboard_export" });
      announce(errorMessage(error, t("errors.reporterExport")));
    }
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-line bg-paper lg:block">
        <DashboardSidebar activeTab={activeTab} onSelect={selectDashboardTab} />
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/90 backdrop-blur-xl">
          <div className="absolute inset-0 dmark-grid" aria-hidden="true" />
          <div className="relative flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="grid h-10 w-10 place-items-center rounded border border-line text-ink-500 lg:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label={t("shell.openNav")}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-brand-ink">
                  {t("shell.commandCenter")}
                </p>
                <h1 className="text-lg font-semibold tracking-tight sm:text-xl">{t("shell.title")}</h1>
              </div>
            </div>

            <label className="hidden min-w-80 items-center gap-3 rounded border border-line bg-paper px-3 md:flex">
              <Search className="h-4 w-4 text-ink-300" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={t("shell.searchPlaceholder")}
                className="min-h-10 w-full bg-transparent text-sm outline-none placeholder:text-ink-300"
              />
            </label>

            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="hidden min-h-10 items-center justify-center rounded border border-line-strong px-4 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand sm:inline-flex"
              >
                {t("shell.marketing")}
              </Link>
              <form className="hidden items-center gap-2 xl:flex" onSubmit={addDomain} aria-label={t("shell.addDomain")}>
                <label className="sr-only" htmlFor="new-domain">
                  {t("shell.domainToProtect")}
                </label>
                <input
                  id="new-domain"
                  value={newDomain}
                  onChange={(event) => setNewDomain(event.target.value)}
                  placeholder="example.is"
                  className="min-h-10 w-44 rounded border border-line bg-card px-3 text-sm outline-none transition placeholder:text-ink-300 focus:border-brand focus:ring-2 focus:ring-brand-soft"
                  aria-invalid={addDomainError ? "true" : undefined}
                />
                <button
                  type="submit"
                  disabled={addingDomain}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addingDomain ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                  {addingDomain ? tc("adding") : tc("addDomain")}
                </button>
              </form>
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand xl:hidden"
                onClick={() => {
                  const input = document.getElementById("new-domain-mobile");
                  input?.scrollIntoView({ behavior: "smooth", block: "center" });
                  window.setTimeout(() => (input as HTMLInputElement | null)?.focus(), 300);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                {tc("addDomain")}
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8">
          {sessionExpired ? (
            <div
              className="mb-5 flex flex-col justify-between gap-3 rounded border border-warn/40 bg-warn-soft px-4 py-3 sm:flex-row sm:items-center"
              role="alert"
            >
              <p className="text-sm font-semibold leading-6 text-warn-ink">
                {t("shell.sessionExpired")}
              </p>
              <Link
                href="/api/dashboard/auth/login"
                className="inline-flex min-h-10 shrink-0 items-center justify-center rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand"
              >
                {t("shell.signInAgain")}
              </Link>
            </div>
          ) : null}

          <label className="mb-5 flex min-h-11 items-center gap-3 rounded border border-line bg-card px-3 md:hidden">
            <Search className="h-4 w-4 text-ink-300" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("shell.searchPlaceholderMobile")}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>

          <form className="mb-5 flex flex-col gap-2 rounded border border-line bg-card p-3 shadow-sm xl:hidden" onSubmit={addDomain} aria-label={t("shell.addDomain")}>
            <label className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-400" htmlFor="new-domain-mobile">
              {t("shell.addDomain")}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="new-domain-mobile"
                value={newDomain}
                onChange={(event) => setNewDomain(event.target.value)}
                placeholder="example.is"
                className="min-h-11 flex-1 rounded border border-line bg-paper px-3 text-sm outline-none transition placeholder:text-ink-300 focus:border-brand focus:ring-2 focus:ring-brand-soft"
                aria-invalid={addDomainError ? "true" : undefined}
              />
              <button
                type="submit"
                disabled={addingDomain}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-60"
              >
                {addingDomain ? <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
                {addingDomain ? tc("adding") : tc("addDomain")}
              </button>
            </div>
            {addDomainError ? <p className="text-sm font-medium text-fail-ink">{addDomainError}</p> : null}
          </form>

          {addDomainError ? <p className="mb-5 hidden text-sm font-medium text-fail-ink xl:block">{addDomainError}</p> : null}

          <motion.div key={activeTab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
          {activeTab === "overview" ? (
            <OverviewTab
              dashboard={dashboard}
              selectedDomain={selectedDomain}
              filteredDomains={filteredDomains}
              trends={trends}
              trendsState={trendsState}
              onAddDomain={focusAddDomainForm}
              onSelectDomain={setSelectedDomainID}
              onOpenTab={selectDashboardTab}
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
              spfRoute={spfRoute}
              spfRouteState={spfRouteState}
              spfRouteError={spfRouteError}
              dnsGuidance={dnsGuidance}
              dnsGuidanceState={dnsGuidanceState}
              dnsGuidanceError={dnsGuidanceError}
              spfRouteHistory={spfRouteHistory}
              spfRouteHistoryState={spfRouteHistoryState}
              syncingSPFRoute={syncingSPFRoute}
              savingSPFRouteSources={savingSPFRouteSources}
              onSyncSPFRoute={syncSelectedSPFRoute}
              onSaveSPFRouteSources={saveSelectedSPFRouteSources}
              onSelectDomain={setSelectedDomainID}
              onRecheckDomain={recheckDomain}
              onExportDomains={exportDomains}
              onCopy={copyText}
              onRetry={retryPanelLoads}
              onAddDomain={focusAddDomainForm}
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
                announce(next === "unknown" ? t("actions.reporterUnknownOnly") : t("actions.reporterAll"));
              }}
              onExport={exportReporterCSV}
              onRetry={retryPanelLoads}
            />
          ) : null}
          {activeTab === "brand-risk" ? (
            <BrandRiskTab
              selectedDomain={selectedDomain}
              brandRisk={brandRisk}
              brandRiskState={brandRiskState}
              brandRiskError={brandRiskError}
              includeInactive={includeInactiveBrandRisk}
              onToggleInactive={() => {
                setIncludeInactiveBrandRisk((current) => !current);
                announce(!includeInactiveBrandRisk ? t("actions.brandRiskInactive") : t("actions.brandRiskActiveOnly"));
              }}
              onRetry={retryPanelLoads}
            />
          ) : null}
          {activeTab === "alerts" ? (
            <AlertsTab alerts={activeAlerts} onOpenDomains={() => selectDashboardTab("domains")} onResolveAlert={resolveAlert} />
          ) : null}
          {activeTab === "settings" ? (
            <SettingsTab
              settings={settings}
              savingSetting={savingSetting}
              savingSettingsForm={savingSettingsForm}
              plan={plan}
              planState={planState}
              error={settingsError}
              onToggle={toggleSetting}
              onDraftChange={updateSettingsDraft}
              onSave={saveSettingsPatch}
              onToggleChannel={toggleNotificationChannel}
            />
          ) : null}
          </motion.div>
        </main>
      </div>

      <div
        className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] rounded border border-brand/30 bg-card px-4 py-3 text-sm font-semibold text-ink shadow-lg"
        role="status"
        aria-live="polite"
      >
        {actionNotice}
      </div>

      {mobileNavOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-midnight/65 backdrop-blur-sm"
            aria-label={t("shell.closeNav")}
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="relative h-full w-80 max-w-[86vw] bg-card shadow-2xl">
            <button
              type="button"
              className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded border border-line text-ink-500"
              onClick={() => setMobileNavOpen(false)}
              aria-label={t("shell.closeNav")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <DashboardSidebar
              activeTab={activeTab}
              onSelect={(tab) => {
                selectDashboardTab(tab);
                setMobileNavOpen(false);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
