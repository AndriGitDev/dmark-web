import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Activity, Building2, ClipboardList, HeartPulse, Lock, Route, ShieldAlert } from "lucide-react";
import { isAdminOwnerSessionAllowed } from "@/lib/admin-access";
import {
  buildAdminShellModel,
  buildOperationalEventsPanelModel,
  buildProviderHealthPanelModel,
  buildSPFRoutePublicationAuditPanelModel,
  fetchAdminOperationalEvents,
  fetchAdminProviderHealth,
  fetchAdminSPFRoutePublicationAudit,
  unavailableOperationalEventsPanel,
  unavailableProviderHealthPanel,
  unavailableSPFRoutePublicationAuditPanel,
  type AdminShellSection,
  type OperationalEventsPanelModel,
  type ProviderHealthPanelModel,
  type SPFRoutePublicationAuditPanelModel,
} from "@/lib/admin-shell";

export const metadata: Metadata = {
  title: "Admin | dmark.is",
  description: "Owner-only Dmark operator control plane.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const sectionIcons: Record<AdminShellSection["id"], typeof ClipboardList> = {
  cases: ClipboardList,
  "spf-route-audit": Route,
  "abuse-decisions": ShieldAlert,
  "provider-health": HeartPulse,
  "operational-events": Activity,
  "company-onboarding": Building2,
};

type AdminPageSearchParams = Record<string, string | string[] | undefined>;

type AdminPageProps = {
  searchParams?: Promise<AdminPageSearchParams>;
};

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const requestHeaders = await headers();
  const model = buildAdminShellModel({ allowed: isAdminOwnerSessionAllowed(requestHeaders) });

  if (model.status === "locked") {
    return <AdminLocked title={model.title} description={model.description} eyebrow={model.eyebrow} />;
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const selectedRouteID = firstSearchParam(resolvedSearchParams.routeID ?? resolvedSearchParams.routeId ?? resolvedSearchParams.route_id).trim();
  const [providerHealth, operationalEvents, publicationAudit] = await Promise.all([
    fetchAdminProviderHealth()
      .then((payload) => buildProviderHealthPanelModel(payload))
      .catch(() => unavailableProviderHealthPanel()),
    fetchAdminOperationalEvents()
      .then((payload) => buildOperationalEventsPanelModel(payload))
      .catch(() => unavailableOperationalEventsPanel()),
    selectedRouteID
      ? fetchAdminSPFRoutePublicationAudit(selectedRouteID)
          .then((payload) => buildSPFRoutePublicationAuditPanelModel(payload))
          .catch(() => unavailableSPFRoutePublicationAuditPanel(selectedRouteID))
      : Promise.resolve(unavailableSPFRoutePublicationAuditPanel()),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-10 text-white sm:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 shadow-[0_30px_120px_rgba(2,6,23,0.45)] sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {model.eyebrow}
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
            <div>
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{model.title}</h1>
              <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">{model.description}</p>
            </div>
            <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-5 text-sm leading-6 text-emerald-50">
              <p className="font-semibold">Fail-closed owner boundary</p>
              <p className="mt-2 text-emerald-100/85">
                This page is rendered only after the server-side owner session guard passes. Browser code never receives admin tokens or owner session secrets.
              </p>
            </div>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-label="Admin control plane sections">
          {model.sections.map((section) => (
            <AdminSectionCard key={section.id} section={section} />
          ))}
        </section>

        <section className="mt-8 grid gap-4 lg:grid-cols-2" aria-label="Read-only admin provider panels">
          <SPFRoutePublicationAuditPanel panel={publicationAudit} selectedRouteID={selectedRouteID} />
          <ProviderHealthPanel panel={providerHealth} />
          <OperationalEventsPanel panel={operationalEvents} />
        </section>

        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.04] p-6 text-sm leading-6 text-slate-300">
          <p className="font-semibold text-white">Operator note</p>
          <p className="mt-2">
            Backend admin calls must stay behind the server-side <code className="rounded bg-white/10 px-1.5 py-0.5">/api/admin</code> proxy and the global admin principal. Keep the customer dashboard at <Link className="text-cyan-200 underline-offset-4 hover:underline" href="/dashboard">/dashboard</Link> separate.
          </p>
        </div>
      </section>
    </main>
  );
}

function AdminLocked({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#e0f2fe_0,#f8fafc_34%,#ffffff_70%)] px-5 py-10 text-navy sm:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-4xl place-items-center">
        <div className="w-full rounded-2xl border border-slate-200 bg-white/90 p-8 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur sm:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-50 px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-700">
            <Lock className="h-4 w-4" aria-hidden="true" />
            {eyebrow}
          </div>
          <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">{description}</p>
          <p className="mt-6 text-sm text-slate-500">Public scanning and client organization dashboards remain outside this owner-only global admin surface.</p>
        </div>
      </section>
    </main>
  );
}

function AdminSectionCard({ section }: { section: AdminShellSection }) {
  const Icon = sectionIcons[section.id];

  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div className="rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 text-cyan-100">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
          {section.status}
        </span>
      </div>
      <h2 className="mt-5 text-xl font-semibold text-white">{section.title}</h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">{section.description}</p>
      {section.endpoint ? (
        <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 font-mono text-xs leading-5 text-cyan-100">
          {section.endpoint}
        </p>
      ) : null}
      <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-300">{section.affordance}</p>
    </article>
  );
}

function SPFRoutePublicationAuditPanel({ panel, selectedRouteID }: { panel: SPFRoutePublicationAuditPanelModel; selectedRouteID: string }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.18)] lg:col-span-2">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Read-only DNS audit</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{panel.title}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{panel.status}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{panel.description}</p>
      <form className="mt-5 flex flex-col gap-3 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-4 sm:flex-row" action="/admin" method="get">
        <label className="flex-1 text-sm font-semibold text-cyan-50">
          Route ID
          <input
            className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-sm text-white outline-none ring-cyan-300/40 focus:ring-2"
            name="routeID"
            defaultValue={selectedRouteID}
            placeholder="spf-route-id"
            autoComplete="off"
          />
        </label>
        <button className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 sm:self-end" type="submit">
          Lookup audit
        </button>
      </form>
      {panel.notice ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">{panel.notice}</p> : null}
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <AuditMetric label="Route ID" value={panel.routeID} />
        <AuditMetric label="Route FQDN" value={panel.routeFQDN} />
        <AuditMetric label="Drift" value={panel.driftStatus} />
        <AuditMetric label="Propagation" value={panel.propagationStatus} />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <DNSAuditRecordList title="Expected TXT" rows={panel.expectedTXT} empty="No expected TXT records returned." />
        <DNSAuditRecordList title="Expected CNAME" rows={panel.expectedCNAME} empty="No expected CNAME records returned." />
      </div>
      {panel.liveDNS.length > 0 ? (
        <div className="mt-5 grid gap-3 lg:grid-cols-2">
          {panel.liveDNS.map((evidence) => (
            <div key={evidence.label} className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-white">{evidence.label} DNS</h3>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 font-mono text-xs text-slate-200">{evidence.status}</span>
              </div>
              <ul className="mt-3 space-y-2 font-mono text-xs text-cyan-100">
                {evidence.values.map((value) => (
                  <li key={`${evidence.label}-${value}`} className="break-all rounded-lg border border-cyan-300/10 bg-cyan-300/5 p-2">
                    {value}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
      <AdminLabelList title="Publication metadata" rows={panel.publishMetadata} />
    </article>
  );
}

function AuditMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-2 break-all font-mono text-sm text-cyan-100">{value}</p>
    </div>
  );
}

function DNSAuditRecordList({ title, rows, empty }: { title: string; rows: Array<{ label: string; value: string; meta?: string }>; empty: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
      <h3 className="font-semibold text-white">{title}</h3>
      {rows.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={`${title}-${row.label}-${row.value}`} className="rounded-lg border border-white/10 bg-slate-950/60 p-3">
              <p className="font-mono text-xs text-slate-400">{row.label}{row.meta ? ` · ${row.meta}` : ""}</p>
              <p className="mt-1 break-all font-mono text-xs text-cyan-100">{row.value}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-slate-400">{empty}</p>
      )}
    </div>
  );
}

function ProviderHealthPanel({ panel }: { panel: ProviderHealthPanelModel }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Read-only health</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{panel.title}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{panel.status}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{panel.description}</p>
      <p className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/10 p-3 font-mono text-xs text-cyan-100">Generated: {panel.generatedAtLabel}</p>
      {panel.notice ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">{panel.notice}</p> : null}
      <AdminLabelList title="Configuration" rows={panel.checks} />
      <AdminLabelList title="Cadence" rows={panel.cadence} />
      <AdminLabelList title="Build metadata" rows={panel.build} />
    </article>
  );
}

function OperationalEventsPanel({ panel }: { panel: OperationalEventsPanelModel }) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_18px_50px_rgba(2,6,23,0.18)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Read-only events</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{panel.title}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">{panel.status}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-300">{panel.description}</p>
      {panel.notice ? <p className="mt-4 rounded-xl border border-amber-300/20 bg-amber-300/10 p-3 text-sm text-amber-50">{panel.notice}</p> : null}
      <div className="mt-5 space-y-3">
        {panel.events.length > 0 ? (
          panel.events.map((event) => (
            <div key={event.id} className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-slate-300">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-red-300/20 bg-red-300/10 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.12em] text-red-100">{event.severity}</span>
                <span className="font-mono text-xs text-cyan-100">{event.kind}</span>
              </div>
              <p className="mt-2 font-semibold text-white">{event.message}</p>
              <p className="mt-1 font-mono text-xs text-slate-400">{event.occurredAt}</p>
              {event.resource ? <p className="mt-2 text-slate-300">Resource: {event.resource}</p> : null}
              {event.actor ? <p className="text-slate-300">Actor: {event.actor}</p> : null}
              {event.metadata.length > 0 ? <AdminLabelList title="Safe metadata" rows={event.metadata} /> : null}
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-white/10 bg-slate-950/50 p-4 text-sm text-slate-300">No error events returned by the admin proxy.</p>
        )}
      </div>
    </article>
  );
}

function firstSearchParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function AdminLabelList({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <dl className="mt-3 grid gap-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/40 px-3 py-2 text-sm">
            <dt className="text-slate-400">{row.label}</dt>
            <dd className="text-right font-medium text-slate-100">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
