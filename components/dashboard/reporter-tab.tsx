"use client";

import { BarChart3, FileText, Filter } from "lucide-react";
import type { ProtectedDomain, ReporterViewModel } from "@/lib/dashboard";
import { CompactStat, EmptyState, PanelNotice } from "./ui";
import type { LoadState } from "./types";

export function ReporterTab({
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
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">Reporter</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">DMARC aggregate intelligence</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-500">
          Sender inventory, alignment rates, and enforcement signals for {selectedDomain.domain}.
        </p>
      </div>

      {reporterState === "loading" ? <PanelNotice text="Loading Reporter data..." /> : null}
      {reporterState === "error" ? (
        <PanelNotice tone="error" text={reporterError || "Reporter data could not be loaded."} />
      ) : null}

      {reporter ? (
        <>
          <section className="grid gap-4 md:grid-cols-5">
            <CompactStat label="Report volume" value={reporter.reportVolume} detail="Current reporting window" />
            <CompactStat label="Aligned messages" value={`${reporter.alignedPercentage}%`} detail="SPF or DKIM aligned" />
            <CompactStat label="Reporter orgs" value={`${reporter.reporterOrgCount}`} detail="Aggregate senders" />
            <CompactStat label="Failures" value={reporter.failures} detail="Unaligned reports" />
            <CompactStat label="Reject candidates" value={`${reporter.rejectCandidates}`} detail="Ready to review" />
          </section>

          {reporter.setupGuidance ? <PanelNotice text={reporter.setupGuidance} /> : null}

          <article className="overflow-hidden rounded border border-line bg-card shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-line p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Sender inventory
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">Top sources by message volume</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onToggleFilter}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line-strong px-4 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand"
                >
                  <Filter className="h-4 w-4" aria-hidden="true" />
                  {sourceFilter === "all" ? "Unknown only" : "All senders"}
                </button>
                <button
                  type="button"
                  onClick={onExport}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white transition hover:bg-midnight"
                >
                  <FileText className="h-4 w-4" aria-hidden="true" />
                  Export CSV
                </button>
              </div>
            </div>
            {reporter.senderSources.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-paper text-xs uppercase tracking-[0.12em] text-ink-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Provider</th>
                      <th className="px-5 py-3 font-semibold">Volume</th>
                      <th className="px-5 py-3 font-semibold">Aligned</th>
                      <th className="px-5 py-3 font-semibold">Classification</th>
                      <th className="px-5 py-3 font-semibold">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {reporter.senderSources.map((source) => (
                      <tr key={source.id}>
                        <td className="px-5 py-4 font-semibold text-ink">{source.provider}</td>
                        <td className="px-5 py-4 text-ink-500">{source.volume}</td>
                        <td className="px-5 py-4 text-ink-500">{source.aligned}%</td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                              source.unknown
                                ? "border-fail/30 bg-fail-soft text-fail-ink"
                                : "border-pass/30 bg-pass-soft text-pass-ink"
                            }`}
                          >
                            {source.unknown ? "Unknown" : "Expected"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-ink-500">{source.trend}</td>
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
