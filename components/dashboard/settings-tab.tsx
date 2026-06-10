"use client";

import { Bell, Gauge } from "lucide-react";
import type { SettingsState } from "@/lib/dashboard";
import { PanelNotice } from "./ui";
import type { NotificationChannel, SettingsKey } from "./types";

export function SettingsTab({
  settings,
  savingSetting,
  savingSettingsForm,
  error,
  onToggle,
  onDraftChange,
  onSave,
  onToggleChannel,
}: {
  settings: SettingsState;
  savingSetting: SettingsKey | null;
  savingSettingsForm: boolean;
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
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-navy">Alignment threshold before p=reject</span>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={settings.alignmentThreshold}
                  onChange={(event) =>
                    onDraftChange({ ...settings, alignmentThreshold: Number.parseInt(event.target.value || "0", 10) })
                  }
                  className="min-h-11 w-28 rounded-md border border-slate-300 px-3 text-sm font-semibold text-navy outline-none focus:border-trust"
                />
                <span className="text-sm font-semibold text-slate-600">%</span>
                <button
                  type="button"
                  onClick={() => onSave(settings)}
                  disabled={savingSettingsForm}
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover disabled:cursor-not-allowed disabled:opacity-70"
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

        <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Notification channels
              </p>
              <h3 className="mt-2 text-xl font-semibold text-navy">Notification channels</h3>
            </div>
            <Bell className="h-5 w-5 text-trust" aria-hidden="true" />
          </div>
          <div className="mt-6 grid gap-3">
            {channels.map((channel) => {
              const enabled = settings.notificationChannels.includes(channel);
              return (
                <label
                  key={channel}
                  className="flex min-h-16 items-center justify-between gap-4 rounded-md border border-slate-200 px-4 transition hover:border-trust"
                >
                  <span className="flex items-center gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-slate-100 text-slate-600">
                      <Bell className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-semibold capitalize text-navy">{channel}</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={() => onToggleChannel(channel)}
                    className="h-5 w-5 accent-trust"
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
