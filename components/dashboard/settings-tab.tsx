"use client";

import { Bell, CreditCard, Gauge } from "lucide-react";
import type { PlanViewModel, SettingsState } from "@/lib/dashboard";
import { CompactStat, PanelNotice } from "./ui";
import type { LoadState, NotificationChannel, SettingsKey } from "./types";

export function SettingsTab({
  settings,
  savingSetting,
  savingSettingsForm,
  plan,
  planState,
  error,
  onToggle,
  onDraftChange,
  onSave,
  onToggleChannel,
}: {
  settings: SettingsState;
  savingSetting: SettingsKey | null;
  savingSettingsForm: boolean;
  plan: PlanViewModel | null;
  planState: LoadState;
  error: string;
  onToggle: (key: SettingsKey) => void;
  onDraftChange: (settings: SettingsState) => void;
  onSave: (settings: SettingsState) => void;
  onToggleChannel: (channel: NotificationChannel) => void;
}) {
  const channels: NotificationChannel[] = ["email", "slack", "webhook"];

  return (
    <div className="grid gap-6">
      <div>
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">Settings</p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Automation and notification controls</h2>
      </div>

      <PlanUsageCard plan={plan} planState={planState} />

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <article className="rounded border border-line bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                Enforcement guardrails
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">DMARC rollout policy</h3>
            </div>
            <Gauge className="h-5 w-5 text-brand-ink" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-4">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-ink">Alignment threshold before p=reject</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.alignmentThreshold}
                  onChange={(event) =>
                    onDraftChange({ ...settings, alignmentThreshold: Number.parseInt(event.target.value || "0", 10) })
                  }
                  className="min-h-11 w-28 rounded border border-line-strong px-3 text-sm font-semibold text-ink outline-none focus:border-brand"
                />
                <span className="text-sm font-semibold text-ink-500">%</span>
                <button
                  type="button"
                  onClick={() => onSave(settings)}
                  disabled={savingSettingsForm}
                  className="inline-flex min-h-11 items-center justify-center rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {savingSettingsForm ? "Saving..." : "Save"}
                </button>
              </div>
            </label>
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
          {error ? <PanelNotice tone="error" text={error} /> : null}
        </article>

        <article className="rounded border border-line bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
                Notification channels
              </p>
              <h3 className="mt-2 text-xl font-semibold text-ink">Notification channels</h3>
            </div>
            <Bell className="h-5 w-5 text-brand-ink" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-3">
            {channels.map((channel) => {
              const enabled = settings.notificationChannels.includes(channel);
              return (
                <label
                  key={channel}
                  className="flex min-h-16 items-center justify-between gap-4 rounded border border-line px-4 transition hover:border-brand"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded bg-paper-soft text-ink-500">
                      <Bell className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold capitalize text-ink">{channel}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => onToggleChannel(channel)}
                    className="h-5 w-5 accent-brand"
                  />
                </label>
              );
            })}
          </div>
        </article>
      </section>
    </div>
  );
}

function PlanUsageCard({ plan, planState }: { plan: PlanViewModel | null; planState: LoadState }) {
  if (planState === "loading") {
    return (
      <article className="rounded border border-line bg-card p-5 shadow-sm">
        <p className="text-sm text-ink-400">Loading plan and usage...</p>
      </article>
    );
  }
  if (!plan) {
    if (planState === "error") {
      return (
        <article className="rounded border border-line bg-card p-5 shadow-sm">
          <p className="text-sm text-ink-400">Plan and usage information is unavailable right now.</p>
        </article>
      );
    }
    return null;
  }

  const usageRatio = plan.savedDomainsLimit > 0 ? plan.savedDomainsUsed / plan.savedDomainsLimit : 0;
  const usagePercent = Math.min(100, Math.round(usageRatio * 100));
  const usageBarTone = usageRatio >= 1 ? "bg-fail" : usageRatio >= 0.8 ? "bg-warn" : "bg-brand";

  return (
    <article className="rounded border border-line bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Plan and usage
          </p>
          <h3 className="mt-2 text-xl font-semibold capitalize text-ink">{plan.plan} plan</h3>
        </div>
        <CreditCard className="h-5 w-5 text-brand-ink" aria-hidden="true" />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm font-semibold text-ink">Protected domains</p>
          <p className="font-mono text-sm text-ink-500">
            {plan.savedDomainsUsed} of {plan.savedDomainsLimit}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-soft" role="presentation">
          <div className={`h-full rounded-full ${usageBarTone}`} style={{ width: `${usagePercent}%` }} />
        </div>
        {plan.savedDomainsRemaining === 0 ? (
          <p className="mt-2 text-sm font-semibold text-fail-ink">
            The plan domain limit is in use; adding another domain requires an upgrade.
          </p>
        ) : null}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <CompactStat
          label="Scan cadence"
          value={plan.scanCadenceMinutes >= 60 ? `${Math.round(plan.scanCadenceMinutes / 60)}h` : `${plan.scanCadenceMinutes}m`}
          detail="Scheduled record checks"
        />
        <CompactStat
          label="Report retention"
          value={plan.reportRetentionDays > 0 ? `${plan.reportRetentionDays}d` : "—"}
          detail="Aggregate report history"
        />
        <CompactStat
          label="Reporter access"
          value={plan.reporter ? "Included" : "Not included"}
          detail="DMARC aggregate intelligence"
        />
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
      className="flex min-h-14 w-full items-center justify-between gap-4 rounded border border-line px-4 text-left transition hover:border-brand disabled:cursor-not-allowed disabled:opacity-70"
      aria-pressed={enabled}
    >
      <p className="text-sm font-semibold text-ink">{title}</p>
      <span
        className={`relative h-7 w-12 rounded-full transition ${enabled ? "bg-brand-ink" : "bg-line-strong"}`}
        aria-hidden="true"
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-card transition ${enabled ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}
