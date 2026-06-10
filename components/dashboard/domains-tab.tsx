"use client";

import { useState } from "react";
import { Copy, Download, Globe2, Plus, RefreshCw, Zap } from "lucide-react";
import {
  buildSPFRoutePanelModel,
  type ChangePlanViewModel,
  type DNSGuidanceViewModel,
  type ProtectedDomain,
  type SPFRouteSource,
  type SPFRouteViewModel,
} from "@/lib/dashboard";
import { changeStatusTone, formatStatus, spfRouteToneClass, statusTone } from "./tones";
import { CompactStat, EmptyState, PanelNotice } from "./ui";
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
  syncingSPFRoute,
  savingSPFRouteSources,
  onSyncSPFRoute,
  onSaveSPFRouteSources,
  onSelectDomain,
  onRecheckDomain,
  onExportDomains,
  onCopy,
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
  syncingSPFRoute: boolean;
  savingSPFRouteSources: boolean;
  onSyncSPFRoute: () => void;
  onSaveSPFRouteSources: (sources: SPFRouteSource[]) => void;
  onSelectDomain: (id: string) => void;
  onRecheckDomain: (domain: ProtectedDomain) => void;
  onExportDomains: (domains: ProtectedDomain[]) => void;
  onCopy: (value: string, label: string) => void;
  recheckingDomainID: string | null;
}) {
  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-trust">Protected domains</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight text-navy">Record monitoring and remediation</h2>
        </div>
        <button
          type="button"
          onClick={() => onExportDomains(domains)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover"
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
              className={`rounded-lg border bg-white p-5 shadow-sm ${
                selectedDomainID === domain.id ? "border-trust ring-2 ring-blue-100" : "border-slate-200"
              }`}
            >
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-xl font-semibold text-navy">{domain.domain}</h3>
                    <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${statusTone(domain.status)}`}>
                      {formatStatus(domain.status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">
                    {domain.owner} · checked {domain.lastChecked}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectDomain(domain.id)}
                    className="inline-flex min-h-10 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
                  >
                    Inspect
                  </button>
                  <button
                    type="button"
                    onClick={() => onRecheckDomain(domain)}
                    disabled={recheckingDomainID === domain.id}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-70"
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
              <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
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

      <DNSGuidancePanel dnsGuidance={dnsGuidance} state={dnsGuidanceState} error={dnsGuidanceError} onCopy={onCopy} />

      <SPFRoutePanel
        key={spfRoute?.id || selectedDomain?.id || "spf-route"}
        spfRoute={spfRoute}
        state={spfRouteState}
        error={spfRouteError}
        syncing={syncingSPFRoute}
        savingSources={savingSPFRouteSources}
        onSync={onSyncSPFRoute}
        onSaveSources={onSaveSPFRouteSources}
        onCopy={onCopy}
      />

      <DNSChangePlan
        selectedDomain={selectedDomain}
        changePlan={changePlan}
        state={changePlanState}
        error={changePlanError}
        onCopy={onCopy}
      />
    </div>
  );
}

function DNSGuidancePanel({
  dnsGuidance,
  state,
  error,
  onCopy,
}: {
  dnsGuidance: DNSGuidanceViewModel | null;
  state: LoadState;
  error: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            DNS provider guidance
          </p>
          <h3 className="mt-2 text-xl font-semibold text-navy">
            {dnsGuidance ? `Provider steps for ${dnsGuidance.domain}` : "Provider-specific DNS steps"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            DNS provider detection is shown as detected, ambiguous, or unknown before instructions are presented so operators do not get false certainty.
          </p>
        </div>
        {dnsGuidance ? (
          <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${spfRouteToneClass(dnsGuidance.statusTone)}`}>
            {dnsGuidance.statusLabel}
          </span>
        ) : null}
      </div>

      {state === "loading" ? <PanelNotice text="Loading DNS provider guidance..." /> : null}
      {state === "error" ? <PanelNotice tone="error" text={error || "DNS provider guidance unavailable."} /> : null}
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
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-navy">Nameserver evidence</p>
              <p className="mt-2 font-mono text-xs text-slate-600">{dnsGuidance.evidenceNameservers.join(", ")}</p>
            </div>
          ) : null}

          <div className="grid gap-3">
            {dnsGuidance.instructions.map((instruction) => (
              <div key={`${instruction.kind}-${instruction.record}`} className="rounded-md border border-slate-200 p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div>
                    <p className="text-sm font-semibold text-navy">
                      {instruction.providerName} · {instruction.recordType} · TTL {instruction.ttl || "default"}
                    </p>
                    <code className="mt-3 block overflow-x-auto rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">
                      {instruction.record}
                    </code>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(instruction.record, "DNS record")}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy DNS record
                  </button>
                </div>
                {instruction.steps.length ? (
                  <ol className="mt-4 grid gap-2 text-sm text-slate-600">
                    {instruction.steps.map((step) => (
                      <li key={step} className="rounded-md bg-slate-50 px-3 py-2">
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
  syncing,
  savingSources,
  onSync,
  onSaveSources,
  onCopy,
}: {
  spfRoute: SPFRouteViewModel | null;
  state: LoadState;
  error: string;
  syncing: boolean;
  savingSources: boolean;
  onSync: () => void;
  onSaveSources: (sources: SPFRouteSource[]) => void;
  onCopy: (value: string, label: string) => void;
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
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            SPF route
          </p>
          <h3 className="mt-2 text-xl font-semibold text-navy">{panel?.heading || "SPF route"}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Manual sync queues a backend job through the dashboard proxy; Bunny DNS credentials stay server-side.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {panel ? (
            <span className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${spfRouteToneClass(panel.statusTone)}`}>
              {panel.statusLabel}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onSync}
            disabled={syncing || state === "loading" || !spfRoute}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover disabled:cursor-not-allowed disabled:opacity-70"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} aria-hidden="true" />
            {syncing ? "Queueing sync..." : "Sync SPF route"}
          </button>
        </div>
      </div>

      {state === "loading" ? <PanelNotice text="Loading SPF route state..." /> : null}
      {state === "error" ? <PanelNotice tone="error" text={error || "SPF route state unavailable."} /> : null}
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
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-navy">Customer CNAME delegation</p>
              <code className="mt-3 block overflow-x-auto rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                {panel.cnameInstruction}
              </code>
              <button
                type="button"
                onClick={() => onCopy(panel.cnameInstruction, "SPF route CNAME")}
                className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy CNAME
              </button>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-navy">Generated SPF preview</p>
              <code className="mt-3 block overflow-x-auto rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                {panel.generatedSPFPreview}
              </code>
              <p className="mt-3 text-xs leading-5 text-slate-500">Last published: {panel.lastPublishedSPF}</p>
            </div>
          </div>

          {panel.errorSummary ? <PanelNotice tone="error" text={panel.errorSummary} /> : null}

          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-md border border-slate-200 p-4">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                <div>
                  <p className="text-sm font-semibold text-navy">SPF source management</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Manage include, ip4, and ip6 sources; credentials stay behind the dashboard proxy.</p>
                </div>
                <button
                  type="button"
                  onClick={addSourceDraft}
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-700 transition hover:border-trust hover:text-trust"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add source
                </button>
              </div>
              <div className="mt-3 grid gap-3">
                {sourceDrafts.map((source, index) => (
                  <div key={`${source.kind}-${source.value}-${index}`} className="grid gap-2 rounded-md bg-slate-50 p-3 md:grid-cols-[8rem_1fr_1fr_auto]">
                    <label className="grid gap-1 text-xs font-semibold text-slate-600">
                      Kind
                      <select
                        value={source.kind}
                        onChange={(event) => updateSourceDraft(index, { kind: event.target.value })}
                        className="min-h-10 rounded-md border border-slate-300 bg-white px-2 text-sm font-semibold text-navy"
                      >
                        <option value="include">include</option>
                        <option value="ip4">ip4</option>
                        <option value="ip6">ip6</option>
                      </select>
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-600">
                      Value
                      <input
                        value={source.value}
                        onChange={(event) => updateSourceDraft(index, { value: event.target.value })}
                        placeholder="_spf.provider.example or 203.0.113.10"
                        className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-navy"
                      />
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-slate-600">
                      Label
                      <input
                        value={source.label}
                        onChange={(event) => updateSourceDraft(index, { label: event.target.value })}
                        placeholder="Provider name"
                        className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-navy"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeSourceDraft(index)}
                      disabled={sourceDrafts.length === 1}
                      className="self-end rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-red-300 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover disabled:cursor-not-allowed disabled:opacity-70"
              >
                {savingSources ? "Saving sources..." : "Save sources"}
              </button>
            </div>

            <div className="rounded-md border border-slate-200 p-4">
              <p className="text-sm font-semibold text-navy">Evidence summary</p>
              {panel.evidenceLabels.length ? (
                <ul className="mt-3 grid gap-2 text-sm text-slate-600">
                  {panel.evidenceLabels.map((evidence) => (
                    <li key={evidence} className="rounded-md bg-slate-50 px-3 py-2">
                      {evidence}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-slate-500">No SPF evidence was returned yet.</p>
              )}
            </div>
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
}: {
  selectedDomain?: ProtectedDomain;
  changePlan: ChangePlanViewModel | null;
  state: LoadState;
  error: string;
  onCopy: (value: string, label: string) => void;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Change plan
        </p>
        <h3 className="mt-2 text-xl font-semibold text-navy">
          {selectedDomain ? `DNS records for ${selectedDomain.domain}` : "DNS records"}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Review staged DNS changes with evidence, risk notes, and rollback guidance before publishing.
        </p>
      </div>

      {state === "loading" ? <PanelNotice text="Loading change plan..." /> : null}
      {state === "error" ? <PanelNotice tone="error" text={error || "Change plan unavailable."} /> : null}
      {state === "ready" && changePlan && changePlan.changes.length === 0 ? (
        <PanelNotice text={changePlan.nextAction || "No DNS changes are currently staged for this domain."} />
      ) : null}

      {changePlan ? (
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {changePlan.journeyState ? <CompactStat label="Journey state" value={changePlan.journeyState.replaceAll("_", " ")} /> : null}
          {changePlan.nextAction ? <CompactStat label="Next action" value={changePlan.nextAction} /> : null}
        </div>
      ) : null}

      {changePlan?.changes.length ? (
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[940px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Change</th>
                <th className="px-4 py-3 font-semibold">Record</th>
                <th className="px-4 py-3 font-semibold">Evidence</th>
                <th className="px-4 py-3 font-semibold">Risk</th>
                <th className="px-4 py-3 font-semibold">Rollback</th>
                <th className="px-4 py-3 font-semibold">Copy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {changePlan.changes.map((change) => (
                <tr key={change.id} className="align-top">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-navy">{change.title}</p>
                    <span className={`mt-2 inline-flex rounded-md border px-2.5 py-1 text-xs font-semibold ${changeStatusTone(change.state)}`}>
                      {change.state}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-mono text-xs font-semibold text-slate-500">
                      {[change.recordName, change.recordType].filter(Boolean).join(" ")}
                    </p>
                    <code className="mt-2 block max-w-[26rem] overflow-x-auto rounded-md border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700">
                      {change.recordText}
                    </code>
                  </td>
                  <td className="max-w-[15rem] px-4 py-4 text-slate-600">{change.evidence || "No evidence returned."}</td>
                  <td className="max-w-[15rem] px-4 py-4 text-slate-600">{change.risk || "No risk note returned."}</td>
                  <td className="max-w-[15rem] px-4 py-4 text-slate-600">{change.rollbackNote || "No rollback note returned."}</td>
                  <td className="px-4 py-4">
                    <button
                      type="button"
                      onClick={() => onCopy(change.recordText, `${change.title} record`)}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-navy px-3 text-sm font-semibold text-white transition hover:bg-navy-soft"
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
