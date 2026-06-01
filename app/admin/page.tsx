import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Activity, Building2, ClipboardList, HeartPulse, Lock, ShieldAlert } from "lucide-react";
import { isAdminOwnerSessionAllowed } from "@/lib/admin-access";
import { buildAdminShellModel, type AdminShellSection } from "@/lib/admin-shell";

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
  "abuse-decisions": ShieldAlert,
  "provider-health": HeartPulse,
  "operational-events": Activity,
  "company-onboarding": Building2,
};

export default async function AdminPage() {
  const requestHeaders = await headers();
  const model = buildAdminShellModel({ allowed: isAdminOwnerSessionAllowed(requestHeaders) });

  if (model.status === "locked") {
    return <AdminLocked title={model.title} description={model.description} eyebrow={model.eyebrow} />;
  }

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
      <p className="mt-4 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-sm leading-6 text-slate-300">{section.affordance}</p>
    </article>
  );
}
