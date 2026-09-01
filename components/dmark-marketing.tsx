"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  Gauge,

  Inbox,
  Layers3,
  LineChart,
  Loader2,
  Lock,

  Radar,
  Route,
  Search,
  Send,
  ServerCog,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { ScanPayload } from "@/lib/scan";
import { trackPrivacyEvent } from "@/lib/privacy-events";
import {
  buildDmarcFinding,
  buildScanEvidenceSummary,
  buildScanRemediationPlan,
  buildSpfFinding,
  mockScan,
  validateScannableDomain,
} from "@/lib/scan";

type CTAOrigin = "nav" | "pricing" | "footer" | "result_upsell";

const scanSteps = [
  { key: "dns", icon: Route },
  { key: "spf", icon: LineChart },
  { key: "dmarc", icon: Eye },
  { key: "spoof", icon: Send },
];

const trustSignals = [
  { key: "live" },
  { key: "beta" },
  { key: "operator" },
  { key: "target" },
];

const quickDomains = ["landsbankinn.is", "kastro.is", "island.is"];

const workflow = [
  {
    number: "01",
    key: "discover",
    icon: Radar,
    tone: "brand",
  },
  {
    number: "02",
    key: "stabilize",
    icon: Layers3,
    tone: "warn",
  },
  {
    number: "03",
    key: "enforce",
    icon: ShieldCheck,
    tone: "pass",
  },
];

const features = [
  {
    key: "flattening",
    icon: Layers3,
  },
  {
    key: "reporting",
    icon: Gauge,
  },
  {
    key: "rollout",
    icon: ServerCog,
  },
];

const pricing = [
  {
    key: "scan",
    mode: "scan",
    featured: false,
  },
  {
    key: "saas",
    mode: "saas",
    featured: true,
  },
  {
    key: "managed",
    mode: "managed",
    featured: false,
  },
] as const;

function toneClasses(tone: string) {
  if (tone === "pass") return "bg-pass-soft text-pass-ink";
  if (tone === "warn") return "bg-warn-soft text-warn-ink";
  if (tone === "fail") return "bg-fail-soft text-fail-ink";
  return "bg-brand-soft text-brand-ink";
}

export function DmarkMarketing() {
  const t = useTranslations("Marketing");
  const locale = useLocale();
  const [domain, setDomain] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "results" | "error">("idle");
  const [activeStep, setActiveStep] = useState(-1);
  const [result, setResult] = useState<ScanPayload | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function focusScanner(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (event.key !== "/" || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") return;
      event.preventDefault();
      document.getElementById("scanner-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", focusScanner);
    return () => window.removeEventListener("keydown", focusScanner);
  }, []);

  useEffect(() => {
    if (scanState !== "scanning") return;
    const timers = scanSteps.map((_, index) => window.setTimeout(() => setActiveStep(index), index * 360));
    return () => timers.forEach(window.clearTimeout);
  }, [scanState]);

  async function handleScan(event?: FormEvent<HTMLFormElement>, sample?: string) {
    event?.preventDefault();
    const validation = validateScannableDomain(sample || domain);

    if (validation.error) {
      trackPrivacyEvent("scan_validation_error", { status: "ERROR", source: "demo_scanner" });
      setError(validation.error);
      setScanState("error");
      setActiveStep(-1);
      return;
    }

    trackPrivacyEvent("scan_start", { source: "demo_scanner" });
    setError("");
    setDomain(validation.domain);
    setResult(null);
    setActiveStep(-1);
    setScanState("scanning");

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1_250));
      const payload = mockScan(validation.domain);
      trackPrivacyEvent("scan_complete", { status: payload.status, source: "demo_scanner" });
      setResult(payload);
      setDomain(payload.domain);
      setScanState("results");
      setActiveStep(scanSteps.length - 1);
    } catch (scanError) {
      trackPrivacyEvent("scan_error", { status: "ERROR", source: "demo_scanner" });
      setError(scanError instanceof Error ? scanError.message : "Scan failed.");
      setScanState("error");
      setActiveStep(-1);
    }
  }

  useEffect(() => {
    if (scanState !== "results" || !result) return;
    trackPrivacyEvent("recommendation_view", { status: result.status, source: "demo_scanner" });
  }, [scanState, result]);

  function openKastroService(source: CTAOrigin) {
    trackPrivacyEvent("cta_click", { source });
    window.location.assign(`https://kastro.is/${locale}/services/dmark`);
  }

  function scrollToScanner(source?: "nav" | "pricing" | "footer") {
    if (source) trackPrivacyEvent("cta_click", { source });
    document.getElementById("scanner-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => inputRef.current?.focus(), 450);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-paper text-ink">
      <a href="#scanner-panel" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-brand-ink focus:px-4 focus:py-3 focus:font-semibold focus:text-white">
        {t("skip")}
      </a>
      <Header onScan={() => scrollToScanner("nav")} onUpgrade={() => openKastroService("nav")} />

      <section id="top" className="relative border-b border-line bg-paper">
        <div className="absolute inset-0 dmark-grid" aria-hidden="true" />
        <div className="relative mx-auto max-w-[1200px] px-5 py-10 sm:px-8 lg:px-12 lg:py-16">
          <div className="grid min-h-[calc(100vh-96px)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_460px]">
            <div>
              <Image className="mb-8 h-auto w-48 drop-shadow-sm sm:w-56" src="/brand/dmark-logo.png" alt="dmark.is" width={769} height={240} sizes="(min-width: 640px) 224px, 192px" priority />
              <p className="inline-flex items-center gap-3 rounded-full border border-line-strong bg-card px-4 py-2 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-ink shadow-sm">
                <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" /> {t("hero.badge")}
              </p>
              <h1 className="mt-6 max-w-4xl text-balance text-[clamp(38px,6.2vw,76px)] font-[760] leading-[0.98] tracking-[-0.035em]">
                {t.rich("hero.title", {
                  brand: (chunks) => <span className="text-brand-ink underline decoration-brand/35 decoration-4 underline-offset-[10px]">{chunks}</span>,
                })}
              </h1>
              <p className="mt-7 max-w-2xl text-pretty text-[clamp(17px,1.5vw,21px)] leading-[1.55] text-ink-500">
                {t("hero.text")}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={() => scrollToScanner("nav")} className="inline-flex min-h-[58px] items-center justify-center gap-3 rounded bg-brand-ink px-8 font-semibold text-white shadow-glow transition hover:-translate-y-0.5 hover:bg-brand-ink">
                  <Search className="h-5 w-5" aria-hidden="true" /> {t("hero.cta_scan")}
                </button>
                <button type="button" onClick={() => openKastroService("nav")} className="inline-flex min-h-[58px] items-center justify-center gap-3 rounded border border-line-strong px-8 font-semibold text-ink transition hover:-translate-y-0.5 hover:border-ink">
                  <Sparkles className="h-5 w-5" aria-hidden="true" /> {t("hero.cta_saas")}
                </button>
              </div>
            </div>

            <div id="scanner-panel" tabIndex={-1}>
              <ScannerCard
                domain={domain}
                setDomain={setDomain}
                scanState={scanState}
                activeStep={activeStep}
                error={error}
                result={result}
                inputRef={inputRef}
                onScan={handleScan}
                onRescan={() => {
                  setScanState("idle");
                  setResult(null);
                  setActiveStep(-1);
                }}
                onUpgrade={() => openKastroService("result_upsell")}
              />
            </div>
          </div>

          <div className="grid gap-px overflow-hidden rounded border border-line bg-line shadow-sm md:grid-cols-4">
            {trustSignals.map((signal) => (
              <article key={signal.key} className="bg-card p-5">
                <p className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-ink-500">{t(`hero.signals.${signal.key}.label`)}</p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{t(`hero.signals.${signal.key}.value`)}</p>
                <p className="mt-2 text-sm leading-6 text-ink-500">{t(`hero.signals.${signal.key}.detail`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="threat" className="bg-paper-soft py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <SectionHead eyebrow={t("threat.eyebrow")} title={t("threat.title")} text={t("threat.text")} />
          <SpoofDemo />
        </div>
      </section>

      <section id="workflow" className="bg-paper py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <SectionHead eyebrow={t("workflow.eyebrow")} title={t("workflow.title")} text={t("workflow.text")} />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {workflow.map((step) => {
              const Icon = step.icon;
              return (
                <article key={step.key} className="relative overflow-hidden rounded border border-line bg-card p-7 shadow-sm">
                  <p className="font-mono text-sm font-semibold tracking-[0.18em] text-ink-500">{step.number}</p>
                  <div className={`mt-7 grid h-12 w-12 place-items-center rounded ${toneClasses(step.tone)}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-7 text-2xl font-bold tracking-tight">{t(`workflow.steps.${step.key}.title`)}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink-500">{t(`workflow.steps.${step.key}.detail`)}</p>
                  <span className={`mt-6 inline-flex rounded-full px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] ${toneClasses(step.tone)}`}>{t(`workflow.steps.${step.key}.tag`)}</span>
                </article>
              );
            })}
          </div>
          <div className="mt-8 rounded border border-line bg-card p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-2xl font-bold tracking-tight">{t("workflow.ladder.title")}</h3>
              <span className="font-mono text-xs text-ink-500">{t("workflow.ladder.detail")}</span>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {["none", "quarantine", "reject"].map((item, index) => (
                <div key={item} className="rounded border border-line bg-paper p-4">
                  <span className="font-mono text-xs font-semibold text-brand-ink">0{index + 1}</span>
                  <p className="mt-2 font-semibold text-ink">{t(`workflow.ladder.${item}`)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="bg-paper-soft py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <SectionHead eyebrow={t("features.eyebrow")} title={t("features.title")} text={t("features.text")} />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.key} className="rounded border border-line bg-card p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-editorial">
                  <div className="grid h-12 w-12 place-items-center rounded bg-brand-soft text-brand-ink">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <h3 className="mt-7 text-2xl font-bold tracking-tight">{t(`features.list.${feature.key}.title`)}</h3>
                  <p className="mt-3 text-sm leading-7 text-ink-500">{t(`features.list.${feature.key}.detail`)}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="proof" className="bg-midnight py-20 text-white lg:py-28">
        <div className="mx-auto grid max-w-[1200px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:px-12">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-d">{t("proof.eyebrow")}</p>
            <h2 className="mt-5 text-balance text-[clamp(30px,4.4vw,54px)] font-bold leading-none tracking-[-0.03em]">{t("proof.title")}</h2>
            <p className="mt-6 max-w-xl text-pretty leading-8 text-white/68">{t("proof.text")}</p>
          </div>
          <ProofConsole />
        </div>
      </section>

      <section id="pricing" className="bg-paper py-20 lg:py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8 lg:px-12">
          <SectionHead eyebrow={t("pricing.eyebrow")} title={t("pricing.title")} text={t("pricing.text")} />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {pricing.map((tier) => (
              <article key={tier.key} className={`rounded border bg-card p-7 shadow-sm ${tier.featured ? "border-brand ring-4 ring-brand-soft" : "border-line"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{t(`pricing.tiers.${tier.key}.name`)}</h3>
                    <p className="mt-3 text-sm leading-7 text-ink-500">{t(`pricing.tiers.${tier.key}.description`)}</p>
                  </div>
                  {tier.featured ? <span className="rounded-full bg-brand-soft px-3 py-1 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-brand-ink">{t("pricing.tiers.core")}</span> : null}
                </div>
                <p className="mt-8 text-3xl font-bold tracking-tight">{t(`pricing.tiers.${tier.key}.price`)}</p>
                <ul className="mt-8 space-y-3">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex gap-3 text-sm text-ink-700">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-pass-ink" aria-hidden="true" /> {t(`pricing.tiers.${tier.key}.points.${i}`)}
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => (tier.mode === "scan" ? scrollToScanner("pricing") : openKastroService("pricing"))} className={`mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded px-5 font-semibold transition hover:-translate-y-0.5 ${tier.featured ? "bg-brand-ink text-white shadow-glow hover:bg-midnight" : "border border-line-strong text-ink hover:border-ink"}`}>
                  {t(`pricing.tiers.${tier.key}.cta`)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ink px-5 py-16 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 rounded border border-white/10 bg-white/[0.03] p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-d">{t("footer_cta.eyebrow")}</p>
            <h2 className="mt-4 text-balance text-3xl font-bold tracking-tight md:text-5xl">{t("footer_cta.title")}</h2>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => scrollToScanner("footer")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-white px-5 font-semibold text-ink transition hover:-translate-y-0.5"><Search className="h-4 w-4" /> {t("footer_cta.cta_scan")}</button>
            <button type="button" onClick={() => openKastroService("footer")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-white/25 px-5 font-semibold text-white transition hover:-translate-y-0.5 hover:bg-white/10"><Sparkles className="h-4 w-4" /> {t("footer_cta.cta_saas")}</button>
          </div>
        </div>
      </section>

      <Footer onScan={() => scrollToScanner("footer")} onUpgrade={() => openKastroService("footer")} />
    </main>
  );
}

function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1.5 rounded border border-line bg-card p-1 font-mono text-[0.65rem] font-bold uppercase tracking-wider text-ink-500 shadow-sm">
      <Link href={pathname} locale="is" className={`rounded px-1.5 py-1 transition ${locale === "is" ? "bg-brand-soft text-brand-ink" : "hover:text-ink"}`}>IS</Link>
      <span className="h-3 w-px bg-line" />
      <Link href={pathname} locale="en" className={`rounded px-1.5 py-1 transition ${locale === "en" ? "bg-brand-soft text-brand-ink" : "hover:text-ink"}`}>EN</Link>
    </div>
  );
}

function Header({ onScan, onUpgrade }: { onScan: () => void; onUpgrade: () => void }) {
  const t = useTranslations("Marketing.header");
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <a href="#top" className="flex items-center gap-3" aria-label={t("logo_aria")}>
          <Image className="h-11 w-auto" src="/brand/dmark-logo.png" alt="dmark.is" width={769} height={240} sizes="152px" priority />
          <span className="sr-only">{t("logo_sr")}</span>
        </a>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink-500 md:flex" aria-label="Primary">
          <a className="transition hover:text-brand" href="#threat">{t("threat")}</a>
          <a className="transition hover:text-brand" href="#workflow">{t("workflow")}</a>
          <a className="transition hover:text-brand" href="#features">{t("features")}</a>
          <a className="transition hover:text-brand" href="#pricing">{t("pricing")}</a>
          <button className="transition hover:text-brand" onClick={onUpgrade} type="button">{t("saas")}</button>
          <LanguageSwitcher />
          <button className="inline-flex min-h-10 items-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white transition hover:bg-brand-ink" onClick={onScan} type="button"><Search className="h-4 w-4" aria-hidden="true" /> {t("cta_scan")}</button>
        </nav>
        <div className="flex items-center gap-3 md:hidden">
          <LanguageSwitcher />
          <button className="inline-flex min-h-10 items-center gap-2 rounded bg-brand-ink px-4 text-sm font-semibold text-white" onClick={onScan} type="button"><Search className="h-4 w-4" /> {t("cta_scan_short")}</button>
        </div>
      </div>
    </header>
  );
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return (
    <div className="max-w-4xl">
      <p className="flex items-center gap-3 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-ink before:h-px before:w-6 before:bg-brand">{eyebrow}</p>
      <h2 className="mt-5 text-balance text-[clamp(30px,4.4vw,54px)] font-bold leading-none tracking-[-0.03em]">{title}</h2>
      <p className="mt-6 max-w-3xl text-pretty text-lg leading-8 text-ink-500">{text}</p>
    </div>
  );
}

function ScannerCard({ domain, setDomain, scanState, activeStep, error, result, inputRef, onScan, onRescan, onUpgrade }: {
  domain: string;
  setDomain: (value: string) => void;
  scanState: "idle" | "scanning" | "results" | "error";
  activeStep: number;
  error: string;
  result: ScanPayload | null;
  inputRef: React.RefObject<HTMLInputElement>;
  onScan: (event?: FormEvent<HTMLFormElement>, sample?: string) => void;
  onRescan: () => void;
  onUpgrade: () => void;
}) {
  const t = useTranslations("Marketing.scanner");
  return (
    <aside className="overflow-hidden rounded border border-line-strong bg-card shadow-editorial">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-soft px-4 py-3">
        <span className="flex items-center gap-1.5" aria-hidden="true"><i className="h-3 w-3 rounded-full bg-fail" /><i className="h-3 w-3 rounded-full bg-warn" /><i className="h-3 w-3 rounded-full bg-pass" /></span>
        <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{t("badge")}</span>
        <span className="inline-flex items-center gap-1.5 font-mono text-xs text-pass-ink"><i className="h-2 w-2 rounded-full bg-pass" />{t("online")}</span>
      </div>
      <div className="p-5 sm:p-6">
        <AnimatePresence mode="wait">
          {scanState === "results" && result ? (
            <motion.div key="results" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <ResultsDashboard result={result} onRescan={onRescan} onUpgrade={onUpgrade} />
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink-700">{t("label")}</span>
                <span className="rounded border border-line bg-paper px-2 py-1 font-mono text-[0.65rem] text-ink-500">{t("shortcut")}</span>
              </div>
              <form onSubmit={onScan} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                <label className="sr-only" htmlFor="domain">{t("input_label")}</label>
                <input id="domain" ref={inputRef} value={domain} onChange={(event) => setDomain(event.target.value)} className="min-h-14 rounded border border-line-strong bg-paper px-4 font-mono text-base text-ink outline-none transition placeholder:text-ink-300 focus:border-brand focus:ring-4 focus:ring-brand-soft" placeholder={t("placeholder")} autoComplete="off" inputMode="url" spellCheck={false} aria-invalid={scanState === "error" ? "true" : undefined} aria-describedby={scanState === "error" ? "domain-error" : undefined} />
                <button type="submit" disabled={scanState === "scanning"} className="inline-flex min-h-14 items-center justify-center gap-2 rounded bg-brand-ink px-5 font-semibold text-white shadow-glow transition hover:bg-brand-ink disabled:cursor-not-allowed disabled:bg-ink-300">
                  {scanState === "scanning" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />} {scanState === "scanning" ? t("scanning") : t("scan")}
                </button>
              </form>
              {scanState !== "scanning" ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-ink-500">{t("try")}</span>
                  {quickDomains.map((sample) => <button key={sample} type="button" onClick={() => onScan(undefined, sample)} className="rounded border border-line bg-paper px-3 py-1.5 font-mono text-xs font-semibold text-ink-500 transition hover:border-brand hover:text-brand">{sample}</button>)}
                </div>
              ) : null}
              {scanState === "error" ? <p id="domain-error" role="alert" className="mt-4 rounded border border-fail/30 bg-fail-soft px-4 py-3 text-sm font-semibold text-fail-ink">{error}</p> : null}
              {scanState === "scanning" ? <div className="mt-5 h-2 overflow-hidden rounded-full bg-paper-soft"><div className="h-full rounded-full bg-brand transition-all duration-300" style={{ width: `${Math.min(100, ((activeStep + 1) / scanSteps.length) * 100)}%` }} /></div> : null}
              <div className="mt-5 grid gap-3">
                {scanSteps.map((step, index) => {
                  const Icon = step.icon;
                  const done = scanState === "results" || (scanState === "scanning" && index < activeStep);
                  const active = scanState === "scanning" && index === activeStep;
                  return (
                    <div key={step.key} className={`flex items-center justify-between gap-3 rounded border p-3 transition ${done ? "border-pass/30 bg-pass-soft" : active ? "border-brand bg-brand-soft" : "border-line bg-paper"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`grid h-9 w-9 place-items-center rounded ${done ? "bg-pass-ink text-white" : active ? "bg-brand-ink text-white" : "bg-card text-ink-500"}`}><Icon className="h-4 w-4" /></span>
                        <span><span className="block text-sm font-semibold text-ink">{t(`steps.${step.key}.title`)}</span><span className="block font-mono text-xs text-ink-500">{t(`steps.${step.key}.detail`)}</span></span>
                      </div>
                      {active ? <Loader2 className="h-4 w-4 animate-spin text-brand-ink" /> : done ? <CheckCircle2 className="h-4 w-4 text-pass-ink" /> : <ChevronRight className="h-4 w-4 text-ink-500" />}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

function ResultsDashboard({ result, onRescan, onUpgrade }: { result: ScanPayload; onRescan: () => void; onUpgrade: () => void }) {
  const t = useTranslations("Marketing.results");
  const grade = result.audit?.grade || (result.status === "PASS" ? "A" : result.status === "WARNING" ? "C" : "F");
  const tone = result.status === "PASS" ? "pass" : result.status === "WARNING" ? "warn" : "fail";
  const spfFinding = buildSpfFinding(result);
  const dmarcFinding = buildDmarcFinding(result);
  const remediationPlan = buildScanRemediationPlan(result);
  const evidence = buildScanEvidenceSummary(result);

  return (
    <div>
      <div className={`rounded border p-5 ${toneClasses(tone)}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em]">{t("badge")}</p>
            <h2 className="mt-3 text-6xl font-extrabold tracking-tight">{grade}</h2>
          </div>
          {tone === "pass" ? <ShieldCheck className="h-9 w-9" /> : tone === "warn" ? <AlertTriangle className="h-9 w-9" /> : <ShieldAlert className="h-9 w-9" />}
        </div>
        <p className="mt-4 font-mono text-sm">{result.domain}</p>
        <p className="mt-3 text-sm leading-6">{result.audit?.message || (result.spoofable ? t("spoofable_default") : t("secure_default"))}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ResultStat label={t("stats.status")} value={result.status} />
          <ResultStat label={t("stats.risk")} value={result.audit?.risk || (result.spoofable ? t("stats.risk_high") : t("stats.risk_low"))} />
          <ResultStat label={t("stats.time")} value={evidence.durationLabel} />
        </div>
        <p className="mt-4 text-xs leading-5 opacity-80">{evidence.sourceLabel} · {t("stats.checked_at", { date: evidence.checkedLabel })}. {evidence.detail}</p>
      </div>
      <div className="mt-5 grid gap-4">
        <TechnicalFinding title={t("findings.spf")} tone={spfFinding.tone} headline={spfFinding.headline} detail={spfFinding.detail} record={result.spf.record} />
        <TechnicalFinding title={t("findings.dmarc")} tone={dmarcFinding.tone} headline={dmarcFinding.headline} record={result.dmarc.record} />
        <article className="rounded border border-line bg-paper p-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">{t("sequence.label")}</p>
          <h3 className="mt-3 text-xl font-bold tracking-tight">{remediationPlan.summary}</h3>
          <ol className="mt-4 grid gap-2">
            {remediationPlan.steps.map((step, index) => <li key={step.title} className="rounded border border-line bg-card p-3 text-sm"><span className="font-mono text-brand-ink">{index + 1}.</span> <strong>{step.title}</strong> — <span className="text-ink-500">{step.detail}</span></li>)}
          </ol>
        </article>
        <button type="button" onClick={onUpgrade} className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-brand-ink px-5 font-semibold text-white shadow-glow transition hover:bg-brand-ink"><Lock className="h-4 w-4" /> {t("cta_unlock")}</button>
        <button type="button" onClick={onRescan} className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-line-strong px-5 font-semibold text-ink transition hover:border-ink"><Search className="h-4 w-4" /> {t("cta_another")}</button>
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded border border-current/20 bg-white/35 p-2"><p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] opacity-70">{label}</p><p className="mt-1 text-sm font-bold capitalize">{value}</p></div>;
}

function TechnicalFinding({ title, tone, headline, detail, record }: { title: string; tone: "fail" | "warning" | "pass"; headline: string; detail?: string; record: string }) {
  const mappedTone = tone === "warning" ? "warn" : tone;
  return (
    <article className="rounded border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div><p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{title}</p><h3 className={`mt-2 font-bold ${mappedTone === "fail" ? "text-fail-ink" : mappedTone === "warn" ? "text-warn-ink" : "text-pass-ink"}`}>{headline}</h3>{detail ? <p className="mt-2 text-sm leading-6 text-ink-500">{detail}</p> : null}</div>
        {mappedTone === "fail" ? <ShieldAlert className="h-5 w-5 shrink-0 text-fail-ink" /> : mappedTone === "warn" ? <AlertTriangle className="h-5 w-5 shrink-0 text-warn-ink" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-pass-ink" />}
      </div>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded bg-midnight p-3 font-mono text-xs leading-6 text-white">{record}</pre>
    </article>
  );
}

function SpoofDemo() {
  const t = useTranslations("Marketing.demo");
  const [protectedMode, setProtectedMode] = useState(false);
  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded border border-line bg-card p-5 shadow-editorial">
        <div className="mb-5 grid grid-cols-2 overflow-hidden rounded border border-line bg-paper p-1">
          <button type="button" onClick={() => setProtectedMode(false)} className={`rounded px-3 py-3 text-sm font-semibold transition ${!protectedMode ? "bg-fail-ink text-white" : "text-ink-500"}`}>{t("toggle_off")}</button>
          <button type="button" onClick={() => setProtectedMode(true)} className={`rounded px-3 py-3 text-sm font-semibold transition ${protectedMode ? "bg-pass-ink text-white" : "text-ink-500"}`}>{t("toggle_on")}</button>
        </div>
        <div className="overflow-hidden rounded border border-line bg-paper">
          <div className="flex flex-wrap items-center gap-3 border-b border-line bg-card px-4 py-3"><Inbox className="h-4 w-4 text-brand-ink" /><span className="font-semibold">{t("inbox_label")}</span><span className="ml-auto font-mono text-xs text-ink-500">{protectedMode ? t("inbox_count_on") : t("inbox_count_off")}</span></div>
          <MailRow safe />
          <MailRow blocked={protectedMode} />
        </div>
        <p className="mt-4 text-center font-mono text-xs text-ink-500">{protectedMode ? t("caption_on") : t("caption_off")}</p>
      </div>
      <div className="grid content-start gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-4 rounded border border-line bg-card p-5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-brand-ink text-sm font-bold text-white">{i + 1}</span>
            <div>
              <h3 className="font-bold">{t(`steps.${i}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-ink-500">{t(`steps.${i}.detail`)}</p>
            </div>
          </div>
        ))}
        <div className="rounded border border-line bg-card p-5 text-sm leading-6 text-ink-500">
          <ShieldCheck className="mb-3 h-5 w-5 text-brand-ink" />
          <strong className="text-ink">{t("footer.title")}</strong> {t("footer.text")}
        </div>
      </div>
    </div>
  );
}

function MailRow({ safe = false, blocked = false }: { safe?: boolean; blocked?: boolean }) {
  const t = useTranslations("Marketing.demo.mail");
  return (
    <div className={`relative flex gap-4 border-b border-line p-4 last:border-b-0 ${blocked ? "opacity-65" : ""}`}>
      <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold ${safe ? "bg-brand-soft text-brand-ink" : "bg-fail-soft text-fail-ink"}`}>N</span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 font-semibold">{t("sender")} <span className={`rounded px-2 py-0.5 font-mono text-[0.65rem] ${safe ? "bg-pass-soft text-pass-ink" : "bg-fail-soft text-fail-ink"}`}>{safe ? t("pass") : t("fail")}</span></div>
        <p className="truncate font-mono text-xs text-ink-500">billing@northwind.is{safe ? "" : t("via", { ip: "185.220.101.4" })}</p>
        <p className="mt-1 font-semibold">{safe ? t("safe.subject") : t("exposed.subject")}</p>
        <p className="text-sm text-ink-500">{safe ? t("safe.body") : t("exposed.body")}</p>
      </div>
      {blocked ? <div className="absolute inset-0 grid place-items-center bg-paper/78"><span className="-rotate-6 rounded border-2 border-fail-ink px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.18em] text-fail-ink">{t("rejected")}</span></div> : null}
    </div>
  );
}

function ProofConsole() {
  const t = useTranslations("Marketing.proof.console");
  return (
    <div className="rounded border border-white/10 bg-midnight-2 p-4 shadow-2xl">
      <div className="flex items-center gap-2 border-b border-white/10 pb-4"><span className="h-3 w-3 rounded-full bg-fail-d" /><span className="h-3 w-3 rounded-full bg-warn-d" /><span className="h-3 w-3 rounded-full bg-pass-d" /><span className="ml-3 font-mono text-xs text-white/65">{t("badge")}</span></div>
      <div className="mt-5 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded bg-white/[0.06] p-5"><p className="font-mono text-xs uppercase tracking-[0.16em] text-white/70">northwind.is</p><p className="mt-4 text-6xl font-extrabold text-fail-d">F</p><p className="mt-4 text-sm leading-6 text-white/70">{t("stats")}</p></div>
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-4 rounded bg-white/[0.06] p-4">
              <div>
                <p className="text-sm font-semibold text-white">{t(`items.${i}.title`)}</p>
                <p className="mt-1 text-xs text-white/70">{t(`items.${i}.detail`)}</p>
              </div>
              <span className="rounded bg-brand/20 px-2.5 py-1 font-mono text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-brand-d">{t(`items.${i}.state`)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer({ onScan, onUpgrade }: { onScan: () => void; onUpgrade: () => void }) {
  const t = useTranslations("Marketing.footer");
  return (
    <footer className="bg-midnight py-10 text-white">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
        <div>
          <span className="inline-flex rounded bg-white px-3 py-2"><Image className="h-10 w-auto" src="/brand/dmark-logo.png" alt="dmark.is" width={769} height={240} sizes="138px" /></span>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">{t("text")}</p>
          <p className="mt-3 text-sm text-white/70">{t.rich("credit", { kastro: (chunks) => <a href="https://kastro.is" className="font-semibold text-white underline decoration-white/30 underline-offset-4 transition hover:decoration-white" target="_blank" rel="noreferrer">{chunks}</a> })}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={onScan} className="inline-flex min-h-11 items-center justify-center gap-2 rounded bg-white px-4 font-semibold text-ink transition hover:bg-brand-soft"><Search className="h-4 w-4" /> {t("cta_scan")}</button>
          <button type="button" onClick={onUpgrade} className="inline-flex min-h-11 items-center justify-center gap-2 rounded border border-white/25 px-4 font-semibold text-white transition hover:bg-white/10"><Gauge className="h-4 w-4" /> {t("cta_saas")}</button>
        </div>
      </div>
    </footer>
  );
}
