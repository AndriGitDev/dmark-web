"use client";

import { useState } from "react";
import { Copy, Download, Globe2, Plus, RefreshCw, Zap } from "lucide-react";
import {
  buildSPFRoutePanelModel,
  type ChangePlanViewModel,
  type DNSGuidanceViewModel,
  type ProtectedDomain,
  type SPFRouteHistoryViewModel,
  type SPFRouteSource,
  type SPFRouteViewModel,
} from "@/lib/dashboard";
import { changeStatusTone, formatStatus, spfRouteToneClass, statusTone } from "./tones";
import { CompactStat, EmptyState, PanelNotice, PanelSkeleton, RetryNotice } from "./ui";
import type { LoadState } from "./types";

export function DomainsTab({
  domains,
  selectedDomainID,
  selectedDomain,
  changePlan,
  changePlanState,
  changePlanError,
  spfRoute,
  spfRouteState,
  spfRouteError,
  dnsGuidance,
  dnsGuidanceState,
  dnsGuidanceError,
  spfRouteHistory,
  spfRouteHistoryState,
  syncingSPFRoute,
  savingSPFRouteSources,
  onSyncSPFRoute,
  onSaveSPFRouteSources,
  onSelectDomain,
  onRecheckDomain,
  onExportDomains,
  onCopy,
  onRetry,
  recheckingDomainID,
}: {
  domains: ProtectedDomain[];
  selectedDomainID: string;
  selectedDomain?: ProtectedDomain;
  changePlan: ChangePlanViewModel | null;
  changePlanState: LoadState;
  changePlanError: string;
  spfRoute: SPFRouteViewModel | null;
  spfRouteState: LoadState;
  spfRouteError: string;
  dnsGuidance: DNSGuidanceViewModel | null;
  dnsGuidanceState: LoadState;
  dnsGuidanceError: string;
  spfRouteHistory: SPFRouteHistoryViewModel | null;
  spfRouteHistoryState: LoadState;
  syncingSPFRoute: boolean;
  savingSPFRouteSources: boolean;
  onSyncSPFRoute: () => void;
  onSaveSPFRouteSources: (sources: SPFRouteSource[]) => void;
  onSelectDomain: (id: string) => void;
  onRecheckDomain: (domain: ProtectedDomain) => void;
  onExportDomains: (domains: ProtectedDomain[]) => void;
  onCopy: (value: string, label: string) => void;
  onRetry: () => void;
  recheckingDomainID: string | null;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">Protected domains</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">Record monitoring and remediation</h2>
        </div>
        <button
          type="button"
          onClick={() => onExportDomains(domains)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white transition hover:bg-brand"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          Export domains
        </button>
      </div>

      {domains.length ? (
        <div className="grid gap-4">
          {domains.map((domain) => (
            <article
              key={domain.id}
              className={`rounded border bg-card p-5 shadow-sm ${
                selectedDomainID === domain.id ? "border-brand ring-2 ring-brand-soft" : "border-line"
              }`}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-ink">{domain.domain}</h3>
                    <span className={`rounded border px-2.5 py-1 text-xs font-semibold ${statusTone(domain.status)}`}>
                      {formatStatus(domain.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ink-400">
                    {domain.owner} · checked {domain.lastChecked}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectDomain(domain.id)}
                    className="inline-flex min-h-10 items-center justify-center rounded border border-line-strong px-3 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => onRecheckDomain(domain)}
                    disabled={recheckingDomainID === domain.id}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-3 text-sm font-semibold text-white transition hover:bg-midnight disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {recheckingDomainID === domain.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    ) : (
                      <Zap className="h-4 w-4" aria-hidden="true" />
                    )}
                    {recheckingDomainID === domain.id ? "Checking..." : "Recheck"}
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
              <p className="mt-4 rounded border border-line bg-paper px-4 py-3 text-sm leading-6 text-ink-500">
                {domain.nextAction}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Globe2}
          title="No protected domains"
          detail="No domains matched the current search or the protected-domain list is empty."
        />
      )}

      <DNSGuidancePanel dnsGuidance={dnsGuidance} state={dnsGuidanceState} error={dnsGuidanceError} onCopy={onCopy} onRetry={onRetry} />

      <SPFRoutePanel
        key={spfRoute?.id || selectedDomain?.id || "spf-route"}
        spfRoute={spfRoute}
        state={spfRouteState}
        error={spfRouteError}
        history={spfRouteHistory}
        historyState={spfRouteHistoryState}
        syncing={syncingSPFRoute}
        savingSources={savingSPFRouteSources}
        onSync={onSyncSPFRoute}
        onSaveSources={onSaveSPFRouteSources}
        onCopy={onCopy}
        onRetry={onRetry}
      />

      <DNSChangePlan
        selectedDomain={selectedDomain}
        changePlan={changePlan}
        state={changePlanState}
        error={changePlanError}
        onCopy={onCopy}
        onRetry={onRetry}
      />
    </div>
  );
}

function DNSGuidancePanel({
  dnsGuidance,
  state,
  error,
  onCopy,
  onRetry,
}: {
  dnsGuidance: DNSGuidanceViewModel | null;
  state: LoadState;
  error: string;
  onCopy: (value: string, label: string) => void;
  onRetry: () => void;
}) {
  return (
    <article className="rounded border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
            DNS provider guidance
          </p>
          <h3 className="mt-2 text-xl font-semibold text-ink">
            {dnsGuidance ? `Provider steps for ${dnsGuidance.domain}` : "Provider-specific DNS steps"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
            DNS provider detection is shown as detected, ambiguous, or unknown before instructions are presented so operators do not get false certainty.
          </p>
        </div>
        {dnsGuidance ? (
          <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${spfRouteToneClass(dnsGuidance.statusTone)}`}>
            {dnsGuidance.statusLabel}
          </span>
        ) : null}
      </div>

      {state === "loading" ? <PanelSkeleton rows={3} /> : null}
      {state === "error" ? <RetryNotice text={error || "DNS provider guidance unavailable."} onRetry={onRetry} /> : null}
      {state === "ready" && !dnsGuidance ? <PanelNotice text="DNS provider guidance was not returned for this domain." /> : null}

      {dnsGuidance ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 md:grid-cols-3">
            <CompactStat label="Provider" value={dnsGuidance.providerName || "Provider unknown"} />
            <CompactStat label="Detection" value={dnsGuidance.statusLabel} />
            <CompactStat label="Confidence" value={dnsGuidance.confidenceLabel} />
          </div>

          {dnsGuidance.resolverError ? <PanelNotice text={`Resolver fallback: ${dnsGuidance.resolverError}`} /> : null}

          {dnsGuidance.evidenceNameservers.length ? (
            <div className="rounded border border-line bg-paper p-4">
              <p className="text-sm font-semibold text-ink">Nameserver evidence</p>
              <p className="mt-2 font-mono text-xs text-ink-500">{dnsGuidance.evidenceNameservers.join(", ")}</p>
            </div>
          ) : null}

          <div className="grid gap-3">
            {dnsGuidance.instructions.map((instruction) => (
              <div key={`${instruction.kind}-${instruction.record}`} className="rounded border border-line p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {instruction.providerName} · {instruction.recordType} · TTL {instruction.ttl || "default"}
                    </p>
                    <code className="mt-3 block overflow-x-auto rounded border border-line bg-paper px-3 py-2 font-mono text-xs text-ink-700">
                      {instruction.record}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(instruction.record, "DNS record")}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-3 text-sm font-semibold text-white transition hover:bg-midnight"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy DNS record
                  </button>
                </div>
                {instruction.steps.length ? (
                  <ol className="mt-4 grid gap-2 text-sm text-ink-500">
                    {instruction.steps.map((step) => (
                      <li key={step} className="rounded bg-paper px-3 py-2">
                        {step}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function SPFRoutePanel({
  spfRoute,
  state,
  error,
  history,
  historyState,
  syncing,
  savingSources,
  onSync,
  onSaveSources,
  onCopy,
  onRetry,
}: {
  spfRoute: SPFRouteViewModel | null;
  state: LoadState;
  error: string;
  history: SPFRouteHistoryViewModel | null;
  historyState: LoadState;
  syncing: boolean;
  savingSources: boolean;
  onSync: () => void;
  onSaveSources: (sources: SPFRouteSource[]) => void;
  onCopy: (value: string, label: string) => void;
  onRetry: () => void;
}) {
  const panel = spfRoute ? buildSPFRoutePanelModel(spfRoute) : null;
  const [sourceDrafts, setSourceDrafts] = useState<SPFRouteSource[]>(() =>
    spfRoute?.enabledSources.length ? spfRoute.enabledSources : [{ kind: "include", value: "", label: "" }],
  );

  function updateSourceDraft(index: number, patch: Partial<SPFRouteSource>) {
    setSourceDrafts((current) => current.map((source, sourceIndex) => (sourceIndex === index ? { ...source, ...patch } : source)));
  }

  function addSourceDraft() {
    setSourceDrafts((current) => [...current, { kind: "include", value: "", label: "" }]);
  }

  function removeSourceDraft(index: number) {
    setSourceDrafts((current) => current.filter((_, sourceIndex) => sourceIndex !== index));
  }

  function saveSourceDrafts() {
    onSaveSources(sourceDrafts.filter((source) => source.value.trim()));
  }

  return (
    <article className="rounded border border-line bg-card p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
            SPF route
          </p>
          <h3 className="mt-2 text-xl font-semibold text-ink">{panel?.heading || "SPF route"}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
            Manual sync queues a backend job through the dashboard proxy; Bunny DNS credentials stay server-side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {panel ? (
            <span className={`rounded border px-3 py-1.5 text-xs font-semibold ${spfRouteToneClass(panel.statusTone)}`}>
              {panel.statusLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onSync}
            disabled={syncing || state === "loading" || !spfRoute}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
            {syncing ? "Queueing sync..." : "Sync SPF route"}
          </button>
        </div>
      </div>

      {state === "loading" ? <PanelSkeleton rows={4} /> : null}
      {state === "error" ? <RetryNotice text={error || "SPF route state unavailable."} onRetry={onRetry} /> : null}
      {state === "ready" && !panel ? <PanelNotice text="No SPF route has been configured for this domain yet." /> : null}

      {panel ? (
        <div className="mt-5 grid gap-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <CompactStat label="Route target" value={panel.routeTarget} />
            <CompactStat label="Last sync" value={panel.lastSyncLabel} />
            <CompactStat label="Sources" value={`${panel.sourceLabels.length}`} />
            <CompactStat label="Evidence" value={`${panel.evidenceLabels.length}`} />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded border border-line bg-paper p-4">
              <p className="text-sm font-semibold text-ink">Customer CNAME delegation</p>
              <code className="mt-3 block overflow-x-auto rounded border border-line bg-card px-3 py-2 font-mono text-xs text-ink-700">
                {panel.cnameInstruction}
              </code>
              <button
                type="button"
                onClick={() => onCopy(panel.cnameInstruction, "SPF route CNAME")}
                className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-3 text-sm font-semibold text-white transition hover:bg-midnight"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy CNAME
              </button>
            </div>

            <div className="rounded border border-line bg-paper p-4">
              <p className="text-sm font-semibold text-ink">Generated SPF preview</p>
              <code className="mt-3 block overflow-x-auto rounded border border-line bg-card px-3 py-2 font-mono text-xs text-ink-700">
                {panel.generatedSPFPreview}
              </code>
              <p className="mt-3 text-xs leading-5 text-ink-400">Last published: {panel.lastPublishedSPF}</p>
            </div>
          </div>

          {panel.errorSummary ? <PanelNotice tone="error" text={panel.errorSummary} /> : null}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded border border-line p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-ink">SPF source management</p>
                  <p className="mt-1 text-xs leading-5 text-ink-400">Manage include, ip4, and ip6 sources; credentials stay behind the dashboard proxy.</p>
                </div>
                <button
                  type="button"
                  onClick={addSourceDraft}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded border border-line-strong px-3 text-sm font-semibold text-ink-700 transition hover:border-brand hover:text-brand"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add source
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {sourceDrafts.map((source, index) => (
                  <div key={`${source.kind}-${source.value}-${index}`} className="grid gap-2 rounded bg-paper p-3 md:grid-cols-[8rem_1fr_1fr_auto]">
                    <label className="grid gap-1 text-xs font-semibold text-ink-500">
                      Kind
                      <select
                        value={source.kind}
                        onChange={(event) => updateSourceDraft(index, { kind: event.target.value })}
                        className="min-h-10 rounded border border-line-strong bg-card px-2 text-sm font-semibold text-ink"
                      >
                        <option value="include">include</option>
                        <option value="ip4">ip4</option>
                        <option value="ip6">ip6</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-ink-500">
                      Value
                      <input
                        value={source.value}
                        onChange={(event) => updateSourceDraft(index, { value: event.target.value })}
                        placeholder="_spf.provider.example or 203.0.113.10"
                        className="min-h-10 rounded border border-line-strong bg-card px-3 text-sm text-ink"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-ink-500">
                      Label
                      <input
                        value={source.label}
                        onChange={(event) => updateSourceDraft(index, { label: event.target.value })}
                        placeholder="Provider name"
                        className="min-h-10 rounded border border-line-strong bg-card px-3 text-sm text-ink"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSourceDraft(index)}
                      disabled={sourceDrafts.length === 1}
                      className="self-end rounded border border-line-strong px-3 py-2 text-sm font-semibold text-ink-700 transition hover:border-fail/40 hover:text-fail-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={saveSourceDrafts}
                disabled={savingSources || !spfRoute || !sourceDrafts.some((source) => source.value.trim())}
                className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white shadow-glow transition hover:bg-brand disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingSources ? "Saving sources..." : "Save sources"}
              </button>
            </div>

            <div className="rounded border border-line p-4">
              <p className="text-sm font-semibold text-ink">Evidence summary</p>
              {panel.evidenceLabels.length ? (
                <ul className="mt-3 grid gap-2 text-sm text-ink-500">
                  {panel.evidenceLabels.map((evidence) => (
                    <li key={evidence} className="rounded bg-paper px-3 py-2">
                      {evidence}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-ink-400">No SPF evidence was returned yet.</p>
              )}
            </div>
          </div>

          <div className="rounded border border-line p-4">
            <p className="text-sm font-semibold text-ink">Sync history</p>
            <p className="mt-1 text-xs leading-5 text-ink-400">
              Recent route publication activity recorded by the backend; provider internals are never shown.
            </p>
            {historyState === "loading" ? <p className="mt-3 text-sm text-ink-400">Loading sync history...</p> : null}
            {historyState === "error" ? <p className="mt-3 text-sm text-ink-400">Sync history is unavailable right now.</p> : null}
            {history && history.events.length ? (
              <ol className="mt-3 grid gap-2">
                {history.events.map((event, index) => (
                  <li key={`${event.kind}-${event.occurredAt}-${index}`} className="flex items-start gap-3 rounded bg-paper px-3 py-2">
                    <span
                      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                        event.severity === "error" ? "bg-fail" : event.severity === "warn" ? "bg-warn" : "bg-pass"
                      }`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-ink">{event.message}</span>
                      <span className="mt-0.5 block font-mono text-[0.68rem] text-ink-400">
                        {new Date(event.occurredAt).toLocaleString()}
                        {event.status ? ` · ${event.status}` : ""}
                        {event.errorClass ? ` · ${event.errorClass}` : ""}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : null}
            {historyState === "ready" && history && history.events.length === 0 ? (
              <p className="mt-3 text-sm text-ink-400">No route activity has been recorded yet.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

function DNSChangePlan({
  selectedDomain,
  changePlan,
  state,
  error,
  onCopy,
  onRetry,
}: {
  selectedDomain?: ProtectedDomain;
  changePlan: ChangePlanViewModel | null;
  state: LoadState;
  error: string;
  onCopy: (value: string, label: string) => void;
  onRetry: () => void;
}) {
  return (
    <article className="rounded border border-line bg-card p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
          Change plan
        </p>
        <h3 className="mt-2 text-xl font-semibold text-ink">
          {selectedDomain ? `DNS records for ${selectedDomain.domain}` : "DNS records"}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
          Review staged DNS changes with evidence, risk notes, and rollback guidance before publishing.
        </p>
      </div>

      {state === "loading" ? <PanelSkeleton rows={3} /> : null}
      {state === "error" ? <RetryNotice text={error || "Change plan unavailable."} onRetry={onRetry} /> : null}
      {state === "ready" && changePlan && changePlan.changes.length === 0 ? (
        <PanelNotice text={changePlan.nextAction || "No DNS changes are currently staged for this domain."} />
      ) : null}

      {changePlan ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {changePlan.journeyState ? <CompactStat label="Journey state" value={changePlan.journeyState.replaceAll("_", " ")} /> : null}
          {changePlan.policy ? (
            <CompactStat
              label="Published policy"
              value={`p=${changePlan.policy}${changePlan.policyPercent && changePlan.policyPercent !== 100 ? ` · pct=${changePlan.policyPercent}` : ""}`}
            />
          ) : null}
          {changePlan.nextAction ? <CompactStat label="Next action" value={changePlan.nextAction} /> : null}
        </div>
      ) : null}

      {changePlan?.journeyReason ? (
        <div
          className={`mt-4 rounded border px-4 py-3 ${
            changePlan.journeyReadyForNext ? "border-pass/30 bg-pass-soft" : "border-line bg-paper"
          }`}
        >
          <p className={`text-sm font-semibold ${changePlan.journeyReadyForNext ? "text-pass-ink" : "text-ink"}`}>
            {changePlan.journeyReadyForNext ? "Ready for the next enforcement step" : "Not ready for the next enforcement step yet"}
          </p>
          <p className="mt-1 text-sm leading-6 text-ink-500">{changePlan.journeyReason}</p>
          {changePlan.journeyBlockingSignals?.length ? (
            <ul className="mt-3 grid gap-2">
              {changePlan.journeyBlockingSignals.map((signal) => (
                <li key={signal} className="flex items-start gap-2 text-sm leading-6 text-warn-ink">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-warn" aria-hidden="true" />
                  {signal}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {changePlan?.changes.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-paper text-xs uppercase tracking-[0.12em] text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">Record</th>
                <th className="px-4 py-3 font-semibold">Evidence</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-4 py-3 font-semibold">Rollback</th>
                <th className="px-4 py-3 font-semibold">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {changePlan.changes.map((change) => (
                <tr key={change.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-ink">{change.title}</p>
                    <span className={`mt-2 inline-flex rounded border px-2.5 py-1 text-xs font-semibold ${changeStatusTone(change.state)}`}>
                      {change.state}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-mono text-xs font-semibold text-ink-400">
                      {[change.recordName, change.recordType].filter(Boolean).join(" ")}
                    </p>
                    <code className="mt-2 block max-w-[26rem] overflow-x-auto rounded border border-line bg-card px-3 py-2 font-mono text-xs text-ink-700">
                      {change.recordText}
                    </code>
                  </td>
                  <td className="max-w-[15rem] px-4 py-4 text-ink-500">{change.evidence || "No evidence returned."}</td>
                  <td className="max-w-[15rem] px-4 py-4 text-ink-500">{change.risk || "No risk note returned."}</td>
                  <td className="max-w-[15rem] px-4 py-4 text-ink-500">{change.rollbackNote || "No rollback note returned."}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => onCopy(change.recordText, `${change.title} record`)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded bg-brand-ink px-3 text-sm font-semibold text-white transition hover:bg-midnight"
                    >
                      <Copy className="h-4 w-4" aria-hidden="true" />
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </article>
  );
}
