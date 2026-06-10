"use client";

import {
  ArrowUpRight,
  BarChart3,
  Check,
  Globe2,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import type { DashboardViewModel, ProtectedDomain } from "@/lib/dashboard";
import { formatStatus, metricTone, statusTone } from "./tones";
import { CompactStat, EmptyState, PanelNotice, dashboardIcon } from "./ui";
import type { TabID } from "./sidebar";

export function OverviewTab({
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
        detail="Add protected domains, then refresh this dashboard to load live posture and Reporter data."
      />
    );
  }

  return (
    <div className="grid gap-6">
      <CommandCenter
        selectedDomain={selectedDomain}
        onOpenReporter={() => onOpenTab("reporter")}
        onOpenBrandRisk={() => onOpenTab("brand-risk")}
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
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-navy">Live domain posture</h2>
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
  onOpenBrandRisk,
  onRecheckDomain,
  recheckingDomainID,
}: {
  selectedDomain: ProtectedDomain;
  onOpenReporter: () => void;
  onOpenBrandRisk: () => void;
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
              <button
                type="button"
                onClick={onOpenBrandRisk}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
              >
                <ShieldAlert className="h-4 w-4" aria-hidden="true" />
                Brand Risk
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
