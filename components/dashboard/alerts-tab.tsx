"use client";

import { ArrowUpRight, Check, CheckCircle2 } from "lucide-react";
import type { DashboardAlert } from "@/lib/dashboard";
import { severityTone } from "./tones";
import { EmptyState } from "./ui";

export function AlertsTab({
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
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">Alert queue</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Changes that need operator review</h2>
        </div>
        <button
          type="button"
          onClick={onOpenDomains}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white transition hover:bg-midnight"
        >
          Review domains
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {alerts.length ? (
        <div className="grid gap-4">
          {alerts.map((alert) => (
            <article key={alert.id} className="rounded border border-line bg-card p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded border px-2.5 py-1 text-xs font-semibold ${severityTone(alert.severity)}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs font-semibold text-ink-400">{alert.age}</span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-ink">{alert.title}</h3>
                  <p className="mt-2 text-sm font-semibold text-brand-ink">{alert.domain}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-500">{alert.detail}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onResolveAlert(alert.id, "acknowledged")}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-3 text-sm font-semibold text-white transition hover:bg-brand"
                  >
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Acknowledge
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveAlert(alert.id, "muted")}
                    className="inline-flex min-h-10 items-center justify-center rounded border border-line-strong px-3 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand"
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
