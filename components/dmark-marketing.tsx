"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  Eye,
  Gauge,
  Globe2,
  Layers3,
  LineChart,
  Loader2,
  Lock,
  MailCheck,
  MapPin,
  Radar,
  Route,
  Send,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TimerReset,
  X,
} from "lucide-react";
import type { ScanPayload, UpgradePayload, UpgradeResponse } from "@/lib/scan";

const loadingSteps = [
  "Querying DNS authority...",
  "Checking SPF depth...",
  "Resolving include chains...",
  "Validating DMARC policy...",
  "Assessing spoof exposure...",
];

const features = [
  {
    title: "Dynamic SPF Flattening",
    description: "Keep Microsoft 365, Google Workspace, marketing tools, and local senders below the 10-lookup limit.",
    icon: DatabaseZap,
  },
  {
    title: "Visual XML Reports",
    description: "Convert aggregate DMARC XML into sender inventory, pass/fail trends, and enforcement readiness.",
    icon: Gauge,
  },
  {
    title: "Provider-Specific DNS Instructions",
    description: "Copy-paste changes tailored for Icelandic DNS providers and reviewed for rollout risk.",
    icon: ClipboardCheck,
  },
];

const trustSignals = [
  { label: "SPF lookup budget", value: "10/10", detail: "Flatten before receivers return permerror.", tone: "amber" },
  { label: "DMARC readiness", value: "p=reject", detail: "Progress through monitor, quarantine, and reject.", tone: "green" },
  { label: "Report visibility", value: "14 orgs", detail: "Google, Microsoft, Yahoo, and Icelandic mail flows.", tone: "blue" },
];

const quickDomains = ["kastro.is", "northwind.is", "fjordpay.is"];

const rolloutSteps = [
  {
    title: "Discover",
    description: "Find SPF, DMARC, DKIM, forwarding, and unknown sender gaps without asking for credentials.",
    icon: Radar,
  },
  {
    title: "Stabilize",
    description: "Flatten SPF, remove stale includes, and document every DNS change before rollout.",
    icon: Layers3,
  },
  {
    title: "Enforce",
    description: "Advance DMARC from p=none to quarantine and reject with report-backed confidence.",
    icon: ShieldCheck,
  },
];

const providerCards = ["ISNIC", "1984", "Premis", "Microsoft 365", "Google Workspace", "Sendgrid"];

const pricing = [
  {
    name: "Skoðun",
    price: "0 ISK",
    description: "Public diagnostic for teams that need a fast read on DMARC and SPF exposure.",
    cta: "Scan Now",
    mode: "scan",
    featured: false,
    points: ["Ungated domain scanner", "Basic SPF and DMARC status", "One-time technical breakdown"],
  },
  {
    name: "Sjálfvirkni",
    price: "4,900 ISK/mo",
    description: "Continuous email-auth remediation for teams that want the system to stay healthy.",
    cta: "Start Subscription",
    mode: "saas",
    featured: true,
    points: ["Automated SPF flattening", "Readable DMARC reporting", "Guided p=reject progression"],
  },
  {
    name: "Kastro Managed",
    price: "45,000 ISK setup + MRR",
    description: "Done-for-you implementation for directors who want DNS changes handled safely.",
    cta: "Book Kastro Setup",
    mode: "managed",
    featured: false,
    points: ["Implementation plan", "DNS provider coordination", "Post-change verification"],
  },
] as const;

type ModalPlan = UpgradePayload["plan"] | null;

export function DmarkMarketing() {
  const [domain, setDomain] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "results" | "error">("idle");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [result, setResult] = useState<ScanPayload | null>(null);
  const [error, setError] = useState("");
  const [modalPlan, setModalPlan] = useState<ModalPlan>(null);

  useEffect(() => {
    if (scanState !== "scanning") return;
    const interval = window.setInterval(() => {
      setLoadingIndex((index) => (index + 1) % loadingSteps.length);
    }, 650);
    return () => window.clearInterval(interval);
  }, [scanState]);

  async function handleScan(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const trimmed = domain.trim();

    if (!trimmed) {
      setError("Enter a domain before scanning.");
      setScanState("error");
      return;
    }

    setError("");
    setLoadingIndex(0);
    setScanState("scanning");

    try {
      const response = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain: trimmed }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Scan failed.");
      }

      const payload = (await response.json()) as ScanPayload;
      setResult(payload);
      setDomain(payload.domain);
      setScanState("results");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Scan failed.");
      setScanState("error");
    }
  }

  function scrollToScanner() {
    document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <a href="#scanner" className="flex items-center gap-3" aria-label="dmark.is home">
            <span className="grid h-9 w-9 place-items-center rounded-md bg-navy text-white">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-semibold tracking-tight">dmark.is</span>
              <span className="block font-mono text-[0.65rem] uppercase tracking-[0.18em] text-muted">
                Icelandic email security
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-7 text-sm font-medium text-slate-600 md:flex" aria-label="Primary">
            <a className="transition hover:text-trust" href="#features">
              Features
            </a>
            <a className="transition hover:text-trust" href="#workflow">
              Workflow
            </a>
            <a className="transition hover:text-trust" href="#proof">
              Proof
            </a>
            <a className="transition hover:text-trust" href="#pricing">
              Pricing
            </a>
            <a className="transition hover:text-trust" href="/dashboard">
              Dashboard
            </a>
            <button
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-trust px-4 text-sm font-semibold text-white transition hover:bg-trust-hover"
              onClick={scrollToScanner}
              type="button"
            >
              <MailCheck className="h-4 w-4" aria-hidden="true" />
              Scan
            </button>
          </nav>
        </div>
      </header>

      <section
        id="scanner"
        className="relative overflow-hidden border-b border-slate-200 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_62%,#eef6ff_100%)]"
      >
        <div className="absolute inset-0 dmark-grid" aria-hidden="true" />
        <div className="relative mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl content-center gap-10 px-5 py-10 sm:px-8 lg:px-10">
          <div className="max-w-5xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-trust shadow-sm">
              <MapPin className="h-4 w-4" aria-hidden="true" />
              dmark.is for Icelandic domain trust
            </div>
            <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-tight text-navy sm:text-6xl lg:text-7xl">
              Scan the DNS records attackers use to borrow your brand.
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-600">
              Run a public DMARC and SPF diagnostic, see exactly why spoofed mail can pass, then move into automated
              flattening, readable reports, and a controlled path to p=reject.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {scanState === "results" && result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <ResultsDashboard result={result} onRescan={() => setScanState("idle")} onUpgrade={() => setModalPlan("saas")} />
              </motion.div>
            ) : (
              <motion.div
                key="scanner-form"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]"
              >
                <div>
                  <form
                    onSubmit={handleScan}
                    className="grid gap-3 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:grid-cols-[1fr_auto]"
                  >
                    <label className="sr-only" htmlFor="domain">
                      Domain
                    </label>
                    <input
                      id="domain"
                      value={domain}
                      onChange={(event) => setDomain(event.target.value)}
                      className="min-h-16 w-full rounded-md border border-transparent bg-slate-50 px-5 font-mono text-base text-navy outline-none transition placeholder:text-slate-400 focus:border-trust focus:bg-white sm:text-lg"
                      placeholder="Enter your domain (e.g., yourcompany.is)"
                      autoComplete="off"
                      inputMode="url"
                    />
                    <button
                      type="submit"
                      disabled={scanState === "scanning"}
                      className="inline-flex min-h-16 items-center justify-center gap-3 rounded-md bg-trust px-7 font-semibold text-white transition hover:bg-trust-hover disabled:cursor-not-allowed disabled:bg-slate-400"
                    >
                      {scanState === "scanning" ? (
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                      ) : (
                        <MailCheck className="h-5 w-5" aria-hidden="true" />
                      )}
                      Scan Domain
                    </button>
                  </form>

                  <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-slate-500">Try:</span>
                    {quickDomains.map((sample) => (
                      <button
                        key={sample}
                        type="button"
                        onClick={() => setDomain(sample)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-mono text-xs font-semibold text-slate-600 transition hover:border-trust hover:text-trust"
                      >
                        {sample}
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 min-h-16">
                    <AnimatePresence mode="wait">
                      {scanState === "scanning" ? (
                        <motion.div
                          key={loadingSteps[loadingIndex]}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 font-mono text-sm text-blue-800"
                        >
                          <span className="h-2 w-2 rounded-full bg-trust" aria-hidden="true" />
                          {loadingSteps[loadingIndex]}
                        </motion.div>
                      ) : null}
                      {scanState === "error" ? (
                        <motion.p
                          key="error"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                        >
                          {error}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                </div>

                <LiveAuditVisual />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-3 md:grid-cols-3">
            {trustSignals.map((signal) => (
              <article key={signal.label} className="rounded-lg border border-white bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {signal.label}
                </p>
                <p
                  className={`mt-2 text-2xl font-semibold tracking-tight ${
                    signal.tone === "green"
                      ? "text-emerald-700"
                      : signal.tone === "amber"
                        ? "text-amber-700"
                        : "text-trust"
                  }`}
                >
                  {signal.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{signal.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-end">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-trust">Remediation path</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy sm:text-5xl">
                A clean path from public scan to enforced policy.
              </h2>
            </div>
            <p className="max-w-3xl text-base leading-8 text-slate-600 lg:justify-self-end">
              dmark is built for the messy middle: legacy vendors, SPF lookup limits, report XML nobody reads, and DNS
              providers where one bad edit can take mail down.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {rolloutSteps.map((step, index) => {
              const Icon = step.icon;
              return (
                <article key={step.title} className="rounded-lg border border-slate-200 bg-slate-50 p-6">
                  <div className="flex items-center justify-between gap-4">
                    <span className="grid h-12 w-12 place-items-center rounded-md bg-white text-trust shadow-sm">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      0{index + 1}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-navy">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-trust">Premium tier</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy sm:text-5xl">
              Move from exposed DNS records to enforced domain trust.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature) => (
              <article key={feature.title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <feature.icon className="h-6 w-6 text-trust" aria-hidden="true" />
                <h3 className="mt-6 text-xl font-semibold text-navy">{feature.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="proof" className="border-y border-slate-200 bg-slate-950 py-20 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:px-10">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-blue-300">Operational proof</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">
              Every recommendation should explain itself.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-300">
              The product view translates DMARC aggregate reports, SPF chains, and DNS records into the next action a
              business can safely approve.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {providerCards.map((provider) => (
                <span
                  key={provider}
                  className="rounded-md border border-white/15 bg-white/8 px-3 py-2 text-sm font-semibold text-slate-200"
                >
                  {provider}
                </span>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 font-mono text-xs text-slate-400">dmark audit console</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-md bg-white/8 p-4">
                <div className="flex items-center gap-2 text-slate-300">
                  <Building2 className="h-4 w-4" aria-hidden="true" />
                  <p className="font-mono text-xs uppercase tracking-[0.16em]">northwind.is</p>
                </div>
                <p className="mt-3 text-5xl font-semibold text-red-300">F</p>
                <p className="mt-3 text-sm leading-6 text-slate-300">p=none, 13 SPF lookups, 4 unknown senders</p>
              </div>
              <div className="grid gap-3">
                {[
                  ["Flatten SPF includes", "Remove stale HubSpot include", "Ready"],
                  ["Quarantine rollout", "Start at pct=25 for seven days", "Review"],
                  ["Unknown sender", "ASN 1299 fails alignment", "Block"],
                ].map(([title, detail, state]) => (
                  <div key={title} className="flex items-center justify-between gap-4 rounded-md bg-white/8 p-4">
                    <div>
                      <p className="text-sm font-semibold text-white">{title}</p>
                      <p className="mt-1 text-xs text-slate-400">{detail}</p>
                    </div>
                    <span className="rounded-md bg-blue-500/20 px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-blue-200">
                      {state}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="pricing" className="border-y border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="max-w-3xl">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-trust">Pricing</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-navy sm:text-5xl">
              Start with proof. Pay when remediation is worth it.
            </h2>
          </div>
          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {pricing.map((tier) => (
              <article
                key={tier.name}
                className={`rounded-lg border bg-white p-6 shadow-sm ${
                  tier.featured ? "border-trust ring-2 ring-blue-100" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-navy">{tier.name}</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{tier.description}</p>
                  </div>
                  {tier.featured ? (
                    <span className="rounded-md bg-blue-50 px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-trust">
                      Core
                    </span>
                  ) : null}
                </div>
                <p className="mt-7 text-3xl font-semibold tracking-tight text-navy">{tier.price}</p>
                <ul className="mt-7 space-y-3">
                  {tier.points.map((point) => (
                    <li key={point} className="flex gap-3 text-sm text-slate-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                      {point}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => (tier.mode === "scan" ? scrollToScanner() : setModalPlan(tier.mode))}
                  className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 font-semibold transition ${
                    tier.featured
                      ? "bg-trust text-white hover:bg-trust-hover"
                      : "border border-slate-300 bg-white text-navy hover:border-trust hover:text-trust"
                  }`}
                >
                  {tier.cta}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-navy py-10 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-10">
          <div>
            <p className="text-lg font-semibold">dmark.is</p>
            <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">
              DMARC/SPF diagnostics, flattening, reporting, and managed rollout for Icelandic businesses.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              A{" "}
              <a
                href="https://kastro.is"
                className="font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white"
                target="_blank"
                rel="noreferrer"
              >
                Kastro
              </a>{" "}
              made product.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={scrollToScanner}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-4 font-semibold text-navy transition hover:bg-blue-50"
            >
              <MailCheck className="h-4 w-4" aria-hidden="true" />
              Scan Domain
            </button>
            <a
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-white/30 px-4 font-semibold text-white transition hover:bg-white/10"
            >
              <Gauge className="h-4 w-4" aria-hidden="true" />
              Dashboard
            </a>
          </div>
        </div>
      </footer>

      <CheckoutModal
        key={`${modalPlan || "closed"}-${result?.domain || domain}`}
        plan={modalPlan}
        domain={result?.domain || domain}
        onClose={() => setModalPlan(null)}
      />
    </main>
  );
}

function LiveAuditVisual() {
  return (
    <aside className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.10)]">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Live audit model
          </p>
          <h2 className="mt-2 text-xl font-semibold text-navy">What the scan checks</h2>
        </div>
        <span className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-trust">
          <Globe2 className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {[
          { label: "DNS authority", value: "NS + TXT", icon: Route },
          { label: "SPF chain", value: "include, a, mx", icon: LineChart },
          { label: "DMARC policy", value: "p, pct, rua", icon: Eye },
          { label: "Spoof exposure", value: "audit grade", icon: Send },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="flex items-center justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-md bg-white text-trust">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-navy">{item.label}</span>
                  <span className="block font-mono text-xs text-slate-500">{item.value}</span>
                </span>
              </div>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
            </div>
          );
        })}
      </div>
      <div className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
          <TimerReset className="h-4 w-4" aria-hidden="true" />
          No login needed
        </p>
        <p className="mt-2 text-sm leading-6 text-amber-800">
          Public DNS is enough to show the first risk picture. Private report ingestion starts after upgrade.
        </p>
      </div>
    </aside>
  );
}

function ResultsDashboard({
  result,
  onRescan,
  onUpgrade,
}: {
  result: ScanPayload;
  onRescan: () => void;
  onUpgrade: () => void;
}) {
  const tone = useMemo(() => {
    if (result.status === "PASS") {
      return {
        label: "Pass",
        className: "border-emerald-200 bg-emerald-50 text-emerald-700",
        icon: ShieldCheck,
      };
    }
    if (result.status === "WARNING") {
      return {
        label: "Warning",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        icon: AlertTriangle,
      };
    }
    return {
      label: "Fail",
      className: "border-red-200 bg-red-50 text-red-700",
      icon: ShieldAlert,
    };
  }, [result.status]);
  const GradeIcon = tone.icon;

  const spfFail = !result.spf.valid || result.spf.lookups > 10;
  const dmarcFail = !result.dmarc.valid || result.dmarc.policy === "none";
  const grade = result.audit?.grade || (result.status === "PASS" ? "A" : result.status === "WARNING" ? "C" : "F");
  const risk = result.audit?.risk || (result.spoofable ? "critical" : "low");

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <aside className={`rounded-lg border p-6 ${tone.className}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em]">Scan result</p>
            <h2 className="mt-4 text-6xl font-semibold tracking-tight sm:text-7xl">{tone.label}</h2>
          </div>
          <GradeIcon className="h-10 w-10" aria-hidden="true" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <ResultStat label="Grade" value={grade} />
          <ResultStat label="Risk" value={risk} />
          <ResultStat label="Time" value={result.durationMs ? `${result.durationMs}ms` : "Live"} />
        </div>
        <p className="mt-6 font-mono text-sm">{result.domain}</p>
        <p className="mt-4 text-sm leading-6">
          {result.audit?.message ||
            (result.spoofable
              ? "This domain can still be abused by unauthorised senders until SPF and DMARC enforcement are corrected."
              : "This domain has enforcing DMARC posture. Keep monitoring for sender and DNS drift.")}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            href="/dashboard"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-trust px-4 font-semibold text-white transition hover:bg-trust-hover"
          >
            <Gauge className="h-4 w-4" aria-hidden="true" />
            Open dashboard
          </a>
          <button
            type="button"
            onClick={onUpgrade}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-navy px-4 font-semibold text-white transition hover:bg-navy-soft"
          >
            <Lock className="h-4 w-4" aria-hidden="true" />
            Upgrade for 4,900 ISK/mo
          </button>
          <button
            type="button"
            onClick={onRescan}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-current px-4 font-semibold transition hover:bg-white/60"
          >
            <MailCheck className="h-4 w-4" aria-hidden="true" />
            Scan another
          </button>
        </div>
      </aside>

      <div className="grid gap-5">
        <TechnicalFinding
          title="SPF Status"
          failed={spfFail}
          headline={
            spfFail
              ? `FAIL - Record uses ${result.spf.lookups} DNS lookups. Legitimate emails may go to spam.`
              : `PASS - Record uses ${result.spf.lookups} DNS lookups.`
          }
          record={result.spf.record}
        />
        <TechnicalFinding
          title="DMARC Status"
          failed={dmarcFail}
          headline={
            dmarcFail
              ? "FAIL - Policy set to p=none. Domain is actively vulnerable to spoofing."
              : `PASS - Policy set to p=${result.dmarc.policy}.`
          }
          record={result.dmarc.record}
        />
        <PaywallPreview failed={result.spoofable || spfFail || dmarcFail} onUpgrade={onUpgrade} />
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-current/20 bg-white/45 p-3">
      <p className="font-mono text-[0.62rem] font-semibold uppercase tracking-[0.16em] opacity-70">{label}</p>
      <p className="mt-2 text-lg font-semibold capitalize tracking-tight">{value}</p>
    </div>
  );
}

function TechnicalFinding({
  title,
  failed,
  headline,
  record,
}: {
  title: string;
  failed: boolean;
  headline: string;
  record: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <h3 className={`mt-3 text-lg font-semibold ${failed ? "text-red-700" : "text-emerald-700"}`}>{headline}</h3>
        </div>
        {failed ? (
          <ShieldAlert className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
        )}
      </div>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-slate-200 bg-slate-950 p-4 font-mono text-xs leading-6 text-slate-100">
        {record}
      </pre>
    </article>
  );
}

function PaywallPreview({ failed, onUpgrade }: { failed: boolean; onUpgrade: () => void }) {
  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="relative min-h-64 bg-slate-100 p-5" aria-hidden="true">
        <div className="grid gap-4 blur-[2px]">
          <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-4">
            <div>
              <div className="h-3 w-28 rounded-sm bg-slate-300" />
              <div className="mt-3 h-8 w-48 rounded-sm bg-blue-200" />
            </div>
            <div className="h-14 w-14 rounded-md bg-emerald-100" />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="h-3 w-20 rounded-sm bg-slate-300" />
              <div className="mt-4 h-10 w-full rounded-sm bg-red-100" />
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="h-3 w-20 rounded-sm bg-slate-300" />
              <div className="mt-4 h-10 w-full rounded-sm bg-blue-100" />
            </div>
            <div className="rounded-md border border-slate-200 bg-white p-4">
              <div className="h-3 w-20 rounded-sm bg-slate-300" />
              <div className="mt-4 h-10 w-full rounded-sm bg-amber-100" />
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="h-3 w-24 rounded-sm bg-slate-300" />
            <div className="mt-4 grid grid-cols-5 gap-2">
              {[70, 45, 80, 36, 62].map((height, index) => (
                <div key={index} className="flex h-20 items-end rounded-sm bg-slate-100 px-2">
                  <div className="w-full rounded-sm bg-trust" style={{ height: `${height}%` }} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="absolute inset-0 grid place-items-center bg-white/58">
          <Lock className="h-9 w-9 text-navy" aria-hidden="true" />
        </div>
      </div>
      <div className="border-t border-slate-200 p-5">
        <p className={`font-semibold ${failed ? "text-red-700" : "text-navy"}`}>
          {failed ? "Your domain is vulnerable." : "Keep enforcement stable."}
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Upgrade to unlock automated SPF flattening, view who is spoofing your brand, and safely enforce a p=reject
          policy.
        </p>
        <button
          type="button"
          onClick={onUpgrade}
          className="mt-5 inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-trust px-5 font-semibold text-white transition hover:bg-trust-hover"
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Upgrade for 4,900 ISK/mo
        </button>
      </div>
    </article>
  );
}

function CheckoutModal({ plan, domain, onClose }: { plan: ModalPlan; domain: string; onClose: () => void }) {
  const [form, setForm] = useState({
    name: "",
    domain,
    email: "",
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [error, setError] = useState("");
  const [claim, setClaim] = useState<UpgradeResponse | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;
    setStatus("submitting");
    setError("");

    try {
      const response = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, plan }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error || "Upgrade request failed.");
      }

      const payload = (await response.json()) as UpgradeResponse;
      setClaim(payload);
      setStatus("success");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Upgrade request failed.");
      setStatus("error");
    }
  }

  return (
    <AnimatePresence>
      {plan ? (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-title"
        >
          <motion.div
            className="w-full max-w-xl rounded-lg bg-white shadow-2xl"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-trust">
                  {plan === "managed" ? "Managed setup" : "Subscription request"}
                </p>
                <h2 id="upgrade-title" className="mt-3 text-2xl font-semibold tracking-tight text-navy">
                  Provision dmark for your domain
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 transition hover:border-slate-400 hover:text-navy"
                aria-label="Close"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {status === "success" ? (
              <div className="p-6">
                <div className="grid h-12 w-12 place-items-center rounded-md bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-navy">Upgrade requested.</h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {claim?.audit?.cta ||
                    "Our team is provisioning your isolated environment. You will receive your kennitala claim/invoice via email shortly."}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-6 inline-flex min-h-11 items-center justify-center rounded-md bg-navy px-4 font-semibold text-white transition hover:bg-navy-soft"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid gap-4 p-6">
                <Field
                  label="Name"
                  value={form.name}
                  onChange={(value) => setForm((current) => ({ ...current, name: value }))}
                  autoComplete="name"
                />
                <Field
                  label="Company Domain"
                  value={form.domain}
                  onChange={(value) => setForm((current) => ({ ...current, domain: value }))}
                  autoComplete="off"
                />
                <Field
                  label="Contact Email"
                  type="email"
                  value={form.email}
                  onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                  autoComplete="email"
                />

                {status === "error" ? (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={status === "submitting"}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-trust px-5 font-semibold text-white transition hover:bg-trust-hover disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  {status === "submitting" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ServerCog className="h-4 w-4" aria-hidden="true" />
                  )}
                  Submit Request
                </button>
              </form>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");

  return (
    <label className="grid gap-2 text-sm font-semibold text-navy" htmlFor={id}>
      {label}
      <input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        autoComplete={autoComplete}
        className="min-h-12 rounded-md border border-slate-300 bg-white px-4 font-mono text-sm font-normal text-navy outline-none transition placeholder:text-slate-400 focus:border-trust focus:ring-4 focus:ring-blue-100"
      />
    </label>
  );
}
