"use client";

import { Filter, ShieldAlert } from "lucide-react";
import type { BrandRiskViewModel, ProtectedDomain } from "@/lib/dashboard";
import { brandRiskSeverityTone } from "./tones";
import { EmptyState, PanelNotice } from "./ui";
import type { LoadState } from "./types";

export function BrandRiskTab({
  selectedDomain,
  brandRisk,
  brandRiskState,
  brandRiskError,
  includeInactive,
  onToggleInactive,
}: {
  selectedDomain?: ProtectedDomain;
  brandRisk: BrandRiskViewModel | null;
  brandRiskState: LoadState;
  brandRiskError: string;
  includeInactive: boolean;
  onToggleInactive: () => void;
}) {
  if (!selectedDomain) {
    return <EmptyState icon={ShieldAlert} title="Domain not found" detail="Select an existing protected domain before opening Brand Risk." />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-trust">Brand Risk</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy">{selectedDomain.domain}</h2>
        </div>
        <button
          type="button"
          onClick={onToggleInactive}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition ${
            includeInactive
              ? "border-trust bg-blue-50 text-trust"
              : "border-slate-300 bg-white text-slate-700 hover:border-trust hover:text-trust"
          }`}
          aria-pressed={includeInactive}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          {includeInactive ? "Hide inactive" : "Include inactive"}
        </button>
      </div>

      {brandRiskState === "loading" ? <PanelNotice text="Loading Brand Risk data..." /> : null}
      {brandRiskState === "error" ? <PanelNotice tone="error" text={brandRiskError || "Brand Risk data could not be loaded."} /> : null}

      {brandRisk ? (
        <>
          <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Email-auth findings
                </p>
                <h3 className="mt-2 text-xl font-semibold text-navy">Authentication posture</h3>
              </div>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {brandRisk.findings.length} finding{brandRisk.findings.length === 1 ? "" : "s"}
              </span>
            </div>

            {brandRisk.findings.length ? (
              <div className="mt-5 grid gap-3">
                {brandRisk.findings.map((finding) => (
                  <div key={finding.id} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${brandRiskSeverityTone(finding.severity)}`}>
                        {finding.severity}
                      </span>
                      <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                        {finding.category}
                      </span>
                    </div>
                    <h4 className="mt-3 text-base font-semibold text-navy">{finding.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{finding.evidence}</p>
                    <p className="mt-3 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm leading-6 text-blue-800">
                      {finding.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <PanelNotice text="No email-auth Brand Risk findings were returned for this domain." />
            )}
          </article>

          <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Defender lookalikes
                </p>
                <h3 className="mt-2 text-xl font-semibold text-navy">Lookalike-domain evidence</h3>
              </div>
              <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
                {brandRisk.lookalikes.filter((candidate) => candidate.activeEvidence).length} active
              </span>
            </div>

            {brandRisk.lookalikes.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Domain</th>
                      <th className="px-5 py-3 font-semibold">Kind</th>
                      <th className="px-5 py-3 font-semibold">DNS evidence</th>
                      <th className="px-5 py-3 font-semibold">Severity</th>
                      <th className="px-5 py-3 font-semibold">Recommended action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {brandRisk.lookalikes.map((candidate) => (
                      <tr key={candidate.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-navy">{candidate.domain}</p>
                          <p className="mt-1 max-w-[18rem] text-sm leading-6 text-slate-600">{candidate.reason}</p>
                          {!candidate.activeEvidence ? (
                            <span className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
                              Inactive candidate
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-slate-600">{candidate.kind}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                candidate.hasAddressRecords
                                  ? "border-orange-200 bg-orange-50 text-orange-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              }`}
                            >
                              A/AAAA
                            </span>
                            <span
                              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                candidate.hasMXRecords
                                  ? "border-orange-200 bg-orange-50 text-orange-700"
                                  : "border-slate-200 bg-slate-50 text-slate-500"
                              }`}
                            >
                              MX
                            </span>
                          </div>
                          <p className="mt-2 max-w-[18rem] text-sm leading-6 text-slate-600">{candidate.evidence}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${brandRiskSeverityTone(candidate.severity)}`}>
                            {candidate.severity}
                          </span>
                        </td>
                        <td className="max-w-[18rem] px-5 py-4 text-slate-600">{candidate.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5">
                <PanelNotice text="Brand Risk has no active lookalike DNS or MX evidence for this domain." />
              </div>
            )}
          </article>
        </>
      ) : null}
    </div>
  );
}
