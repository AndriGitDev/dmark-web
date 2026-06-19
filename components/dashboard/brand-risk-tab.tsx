"use client";

import { Filter, ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import type { BrandRiskViewModel, ProtectedDomain } from "@/lib/dashboard";
import { brandRiskSeverityTone } from "./tones";
import { EmptyState, PanelNotice, PanelSkeleton, RetryNotice } from "./ui";
import type { LoadState } from "./types";

export function BrandRiskTab({
  selectedDomain,
  brandRisk,
  brandRiskState,
  brandRiskError,
  includeInactive,
  onToggleInactive,
  onRetry,
}: {
  selectedDomain?: ProtectedDomain;
  brandRisk: BrandRiskViewModel | null;
  brandRiskState: LoadState;
  brandRiskError: string;
  includeInactive: boolean;
  onToggleInactive: () => void;
  onRetry: () => void;
}) {
  const t = useTranslations("Dashboard.brandRisk");
  const tErrors = useTranslations("Dashboard.errors");
  if (!selectedDomain) {
    return <EmptyState icon={ShieldAlert} title="Domain not found" detail="Select an existing protected domain before opening Brand Risk." />;
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">{t("title")}</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">{selectedDomain.domain}</h2>
        </div>
        <button
          type="button"
          onClick={onToggleInactive}
          className={`inline-flex min-h-11 items-center justify-center gap-2 rounded border px-4 text-sm font-semibold transition ${
            includeInactive
              ? "border-brand bg-brand-soft text-brand-ink"
              : "border-line-strong bg-card text-ink-700 hover:border-brand hover:text-brand"
          }`}
          aria-pressed={includeInactive}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          {includeInactive ? t("activeOnly") : t("all")}
        </button>
      </div>

      {brandRiskState === "loading" ? <PanelSkeleton rows={4} /> : null}
      {brandRiskState === "error" ? <RetryNotice text={brandRiskError || tErrors("brandRisk")} onRetry={onRetry} /> : null}

      {brandRisk ? (
        <>
          <article className="rounded border border-line bg-card p-5 shadow-sm">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  {t("emailAuthFindings")}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{t("authPosture")}</h3>
              </div>
              <span className="rounded border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-500">
                {brandRisk.findings.length} {brandRisk.findings.length === 1 ? t("finding") : t("findings")}
              </span>
            </div>

            {brandRisk.findings.length ? (
              <div className="mt-5 grid gap-3">
                {brandRisk.findings.map((finding) => (
                  <div key={finding.id} className="rounded border border-line bg-paper p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded border px-2.5 py-1 text-xs font-semibold ${brandRiskSeverityTone(finding.severity)}`}>
                        {finding.severity}
                      </span>
                      <span className="rounded border border-line bg-card px-2.5 py-1 text-xs font-semibold text-ink-500">
                        {finding.category}
                      </span>
                    </div>
                    <h4 className="mt-3 text-base font-semibold text-ink">{finding.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-ink-500">{finding.evidence}</p>
                    <p className="mt-3 rounded border border-brand/30 bg-brand-soft px-3 py-2 text-sm leading-6 text-brand-ink">
                      {finding.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <PanelNotice text={t("noFindings")} />
            )}
          </article>

          <article className="overflow-hidden rounded border border-line bg-card shadow-sm">
            <div className="flex flex-col justify-between gap-3 border-b border-line p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                  {t("lookalikes")}
                </p>
                <h3 className="mt-2 text-xl font-semibold text-ink">{t("lookalikeEvidence")}</h3>
              </div>
              <span className="rounded border border-line bg-paper px-3 py-1.5 text-xs font-semibold text-ink-500">
                {brandRisk.lookalikes.filter((candidate) => candidate.activeEvidence).length} {t("activeEvidence")}
              </span>
            </div>

            {brandRisk.lookalikes.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-paper text-xs uppercase tracking-[0.12em] text-ink-400">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{t("table.domain")}</th>
                      <th className="px-5 py-3 font-semibold">{t("table.kind")}</th>
                      <th className="px-5 py-3 font-semibold">{t("table.evidence")}</th>
                      <th className="px-5 py-3 font-semibold">{t("table.severity")}</th>
                      <th className="px-5 py-3 font-semibold">{t("table.action")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {brandRisk.lookalikes.map((candidate) => (
                      <tr key={candidate.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-ink">{candidate.domain}</p>
                          <p className="mt-1 max-w-[18rem] text-sm leading-6 text-ink-500">{candidate.reason}</p>
                          {!candidate.activeEvidence ? (
                            <span className="mt-2 inline-flex rounded border border-line bg-paper px-2.5 py-1 text-xs font-semibold text-ink-500">
                              {t("inactiveCandidate")}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-5 py-4 text-ink-500">{candidate.kind}</td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                                candidate.hasAddressRecords
                                  ? "border-warn/40 bg-warn-soft text-warn-ink"
                                  : "border-line bg-paper text-ink-400"
                              }`}
                            >
                              A/AAAA
                            </span>
                            <span
                              className={`rounded border px-2.5 py-1 text-xs font-semibold ${
                                candidate.hasMXRecords
                                  ? "border-warn/40 bg-warn-soft text-warn-ink"
                                  : "border-line bg-paper text-ink-400"
                              }`}
                            >
                              MX
                            </span>
                          </div>
                          <p className="mt-2 max-w-[18rem] text-sm leading-6 text-ink-500">{candidate.evidence}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`rounded border px-2.5 py-1 text-xs font-semibold ${brandRiskSeverityTone(candidate.severity)}`}>
                            {candidate.severity}
                          </span>
                        </td>
                        <td className="max-w-[18rem] px-5 py-4 text-ink-500">{candidate.recommendedAction}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-5">
                <PanelNotice text={t("noEvidence")} />
              </div>
            )}
          </article>
        </>
      ) : null}
    </div>
  );
}
