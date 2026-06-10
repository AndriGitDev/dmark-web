"use client";

import { motion } from "framer-motion";
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
        {dashboard.metrics.map((metric, index) => {
          const Icon = dashboardIcon(metric.icon);
          return (
            <motion.article
              key={metric.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="rounded border border-line bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-editorial"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-ink">{metric.value}</p>
                </div>
                <span className={`grid h-10 w-10 place-items-center rounded border ${metricTone(metric.tone)}`}>
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
              </div>
              <p className="mt-4 text-sm text-ink-500">{metric.detail}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-pass-ink">
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                {metric.trend}
              </p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <article className="rounded border border-line bg-card p-5 shadow-sm">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                Fleet health
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">Live domain posture</h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenTab("reporter")}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line-strong px-4 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand"
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
                className={`flex min-h-14 items-center justify-between gap-4 rounded border px-4 text-left transition ${
                  selectedDomain.id === domain.id
                    ? "border-brand bg-brand-soft text-brand-ink"
                    : "border-line bg-card text-ink-700 hover:border-line-strong"
                }`}
              >
                <span>
                  <span className="block text-sm font-semibold">{domain.domain}</span>
                  <span className="mt-1 block text-xs text-ink-400">{domain.nextAction}</span>
                </span>
                <span className="font-mono text-sm font-semibold">{domain.score}</span>
              </button>
            ))}
          </div>
        </article>

        <article className="rounded border border-line bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                Focus domain
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">{selectedDomain.domain}</h2>
            </div>
            <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${statusTone(selectedDomain.status)}`}>
              {formatStatus(selectedDomain.status)}
            </span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <CompactStat label="Score" value={`${selectedDomain.score}`} />
            <CompactStat label="DMARC" value={`p=${selectedDomain.dmarcPolicy}`} />
            <CompactStat label="SPF lookups" value={`${selectedDomain.spfLookups}`} />
            <CompactStat label="Alignment" value={`${selectedDomain.alignmentRate}%`} />
          </div>
          <p className="mt-5 rounded border border-line bg-paper px-4 py-3 text-sm leading-6 text-ink-500">
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
    <section className="overflow-hidden rounded border border-line bg-card shadow-editorial">
      <div className="grid gap-0 lg:grid-cols-[1fr_380px]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded border border-brand/30 bg-brand-soft px-3 py-1.5 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-brand-ink">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Operator view
            </span>
            <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${statusTone(selectedDomain.status)}`}>
              {formatStatus(selectedDomain.status)}
            </span>
          </div>
          <div className="mt-5 flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-ink">{selectedDomain.domain}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-500">{selectedDomain.nextAction}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onRecheckDomain(selectedDomain)}
                disabled={isRechecking}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-70"
              >
                <RefreshCw className={`h-4 w-4 ${isRechecking ? "animate-spin" : ""}`} aria-hidden="true" />
                {isRechecking ? "Checking..." : "Recheck DNS"}
              </button>
              <button
                type="button"
                onClick={onOpenReporter}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line-strong px-4 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand"
              >
                <BarChart3 className="h-4 w-4" aria-hidden="true" />
                Reports
              </button>
              <button
                type="button"
                onClick={onOpenBrandRisk}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line-strong px-4 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand"
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

        <div className="border-t border-line bg-paper p-5 lg:border-l lg:border-t-0">
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
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
                    className={`grid h-9 w-9 place-items-center rounded border text-sm font-semibold ${
                      active ? "border-brand bg-brand-soft text-brand-ink" : "border-line bg-card text-ink-300"
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize text-ink">{policy}</p>
                    <p className="font-mono text-xs text-ink-400">p={policy}</p>
                  </div>
                  {active ? <Check className="h-4 w-4 text-pass-ink" aria-hidden="true" /> : null}
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
    <article className="rounded border border-line bg-card p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
          Remediation queue
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">Recommended next actions</h2>
      </div>
      {dashboard.recommendations.length ? (
        <div className="mt-5 grid gap-3">
          {dashboard.recommendations.map((item) => (
            <div key={item.id} className="rounded border border-line p-4">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start">
                <div>
                  <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                  <p className="mt-1 text-xs font-semibold text-brand-ink">{item.domain}</p>
                </div>
                <span className="w-fit rounded border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink-500">
                  {item.due}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-ink-500">{item.impact}</p>
              <p className="mt-3 text-xs font-semibold text-ink-400">Effort: {item.effort}</p>
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
    <article className="rounded border border-line bg-card p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
          Audit trail
        </p>
        <h2 className="mt-2 text-xl font-semibold text-ink">Recent activity</h2>
      </div>
      <div className="mt-5 grid gap-4">
        {dashboard.activityEvents.map((event) => {
          const Icon = dashboardIcon(event.icon);
          return (
            <div key={`${event.title}-${event.time}`} className="flex gap-3">
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded bg-paper-soft text-ink-500">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-ink">{event.title}</p>
                <p className="mt-1 text-sm leading-6 text-ink-500">{event.detail}</p>
                <p className="mt-1 font-mono text-[0.68rem] uppercase tracking-[0.14em] text-ink-300">{event.time}</p>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}
