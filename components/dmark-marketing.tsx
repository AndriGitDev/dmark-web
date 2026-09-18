"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import {
  Menu,
  X,
  Globe2,
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
} from "lucide-react";
import type { ScanPayload } from "@/lib/scan";
import { trackPrivacyEvent } from "@/lib/privacy-events";
import { validateScannableDomain } from "@/lib/scan";
import { presentScan } from "@/lib/scan-presentation";

type CTAOrigin = "nav" | "pricing" | "footer" | "result_upsell";

const scanSteps = [
  { key: "dns", icon: Route },
  { key: "spf", icon: LineChart },
  { key: "dmarc", icon: Eye },
  { key: "spoof", icon: Send },
];

const quickDomains = ["kastro.is", "island.is", "example.com"];

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
  const scanController = useRef<AbortController | null>(null);
  useEffect(() => () => scanController.current?.abort(), []);

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

  async function handleScan(event?: FormEvent<HTMLFormElement>, sample?: string) {
    event?.preventDefault();
    if (scanController.current) return;
    const validation = validateScannableDomain(sample || domain);

    if (validation.error) {
      trackPrivacyEvent("scan_validation_error", { status: "ERROR", source: "live_scanner" });
      setError(t("scanner.errors.invalid_domain"));
      setScanState("error");
      setActiveStep(-1);
      return;
    }

    trackPrivacyEvent("scan_start", { source: "live_scanner" });
    setError("");
    setDomain(validation.domain);
    setResult(null);
    setActiveStep(-1);
    setScanState("scanning");

    const controller = new AbortController();
    scanController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 50_000);
    try {
      const response = await fetch("/api/scan/", {
        method: "POST", headers: {"Content-Type": "application/json"},
        body: JSON.stringify({domain: validation.domain}), signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.code === "RATE_LIMITED" ? t("scanner.errors.rate_limit") : data.code === "TIMEOUT" ? t("scanner.errors.timeout") : t("scanner.errors.failed"));
      const payload = data as ScanPayload;
      if (payload.source !== "live" || payload.domain !== validation.domain || !payload.spf || !payload.dmarc) throw new Error(t("scanner.errors.failed"));
      trackPrivacyEvent("scan_complete", { status: payload.status, source: "live_scanner" });
      setResult(payload);
      setDomain(payload.domain);
      setScanState("results");
      setActiveStep(scanSteps.length - 1);
    } catch (scanError) {
      trackPrivacyEvent("scan_error", { status: "ERROR", source: "live_scanner" });
      setError(controller.signal.aborted ? t("scanner.errors.timeout") : scanError instanceof Error && [t("scanner.errors.rate_limit"), t("scanner.errors.timeout"), t("scanner.errors.failed")].includes(scanError.message) ? scanError.message : t("scanner.errors.failed"));
      setScanState("error");
      setActiveStep(-1);
    } finally {
      window.clearTimeout(timeout);
      scanController.current = null;
    }
  }

  useEffect(() => {
    if (scanState !== "results" || !result) return;
    trackPrivacyEvent("recommendation_view", { status: result.status, source: "live_scanner" });
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
    <MotionConfig reducedMotion="user"><main className="dmark-site">
      <a href="#scanner-panel" className="skip-link">{t("skip")}</a>
      <Header onScan={() => scrollToScanner("nav")} onUpgrade={() => openKastroService("nav")} />
      <section id="top" className="hero-section">
        <div className="shell hero-layout">
          <div className="hero-copy">
            <p className="eyebrow"><Globe2 size={16} /> {t("hero.badge")}</p>
            <h1>{t.rich("hero.title", {brand: chunks => <span>{chunks}</span>})}</h1>
            <p className="hero-description">{t("hero.text")}</p>
            <div className="hero-actions">
              <button className="button primary" onClick={() => scrollToScanner("nav")}>{t("hero.cta_scan")} <ArrowRight size={18} /></button>
              <button className="text-button" onClick={() => openKastroService("nav")}>{t("hero.cta_saas")} <ChevronRight size={17} /></button>
            </div>
            <p className="hero-note"><Lock size={14} /> {t("hero.signals.live.detail")}</p>
          </div>
          <div className="hero-product">
            <div className="product-caption"><span>01 / DMARK</span><span>SPF · DKIM · DMARC</span></div>
            <div id="scanner-panel" tabIndex={-1}>
              <ScannerCard domain={domain} setDomain={setDomain} scanState={scanState} activeStep={activeStep} error={error} result={result} inputRef={inputRef} onScan={handleScan} onRescan={() => {setScanState("idle"); setResult(null); setActiveStep(-1); inputRef.current?.focus();}} onUpgrade={() => openKastroService("result_upsell")} />
            </div>
            <div className="product-bottom"><span>{t("hero.signals.target.label")}</span><code>p=none <ArrowRight size={14} /> <strong>p=reject</strong></code></div>
          </div>
        </div>
        <div className="shell protocol-strip"><span>{t("hero.signals.operator.label")}</span><strong>Microsoft 365</strong><strong>Google Workspace</strong><span className="protocol-end">DNS / SPF / DKIM / DMARC</span></div>
      </section>
      <section id="threat" className="section light-section">
        <div className="shell">
          <SectionHead eyebrow={t("threat.eyebrow")} title={t("threat.title")} text={t("threat.text")} />
          <SpoofDemo />
        </div>
      </section>
      <section id="workflow" className="section workflow-section">
        <div className="shell">
          <SectionHead eyebrow={t("workflow.eyebrow")} title={t("workflow.title")} text={t("workflow.text")} />
          <div className="workflow-grid">{workflow.map(step => {const Icon = step.icon; return <article key={step.key} className="workflow-step"><div className="step-top"><span>{step.number}</span><Icon size={24} /></div><h3>{t(`workflow.steps.${step.key}.title`)}</h3><p>{t(`workflow.steps.${step.key}.detail`)}</p><span className="step-tag">{t(`workflow.steps.${step.key}.tag`)}</span></article>;})}</div>
          <div className="policy-track">{["none", "quarantine", "reject"].map((item,i) => <div key={item}><span>0{i+1}</span><p>{t(`workflow.ladder.${item}`)}</p>{i < 2 && <ArrowRight size={20}/>}</div>)}</div>
        </div>
      </section>
      <section id="features" className="section light-section">
        <div className="shell feature-layout"><SectionHead eyebrow={t("features.eyebrow")} title={t("features.title")} text={t("features.text")} /><div className="feature-list">{features.map(feature => {const Icon=feature.icon;return <article key={feature.key}><Icon size={25}/><div><h3>{t(`features.list.${feature.key}.title`)}</h3><p>{t(`features.list.${feature.key}.detail`)}</p></div></article>;})}</div></div>
      </section>
      <section id="proof" className="section proof-section"><div className="shell proof-layout"><SectionHead eyebrow={t("proof.eyebrow")} title={t("proof.title")} text={t("proof.text")} /><ProofConsole /></div></section>
      <section id="pricing" className="section light-section"><div className="shell"><SectionHead eyebrow={t("pricing.eyebrow")} title={t("pricing.title")} text={t("pricing.text")} /><div className="pricing-grid">{pricing.map(tier => <article key={tier.key} className={`price-card ${tier.featured ? "featured" : ""}`}><div className="tier-label"><h3>{t(`pricing.tiers.${tier.key}.name`)}</h3>{tier.featured && <span>{t("pricing.tiers.core")}</span>}</div><p className="price-description">{t(`pricing.tiers.${tier.key}.description`)}</p><p className="price">{t(`pricing.tiers.${tier.key}.price`)}</p><ul>{[0,1,2].map(i=><li key={i}><Check size={17}/>{t(`pricing.tiers.${tier.key}.points.${i}`)}</li>)}</ul><button className={`button ${tier.featured ? "primary" : "secondary"}`} onClick={() => tier.mode === "scan" ? scrollToScanner("pricing") : openKastroService("pricing")}>{t(`pricing.tiers.${tier.key}.cta`)}<ArrowRight size={17}/></button></article>)}</div></div></section>
      <section className="closing-section"><div className="shell"><p className="eyebrow">{t("footer_cta.eyebrow")}</p><h2>{t("footer_cta.title")}</h2><button className="button dark-button" onClick={() => scrollToScanner("footer")}>{t("footer_cta.cta_scan")}<ArrowRight size={20}/></button><span className="closing-word" aria-hidden="true">dmark.</span></div></section>
      <Footer onScan={() => scrollToScanner("footer")} onUpgrade={() => openKastroService("footer")} />
    </main></MotionConfig>
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

function Wordmark() { return <span className="wordmark">dmark<span>.</span></span>; }

function Header({ onScan, onUpgrade }: { onScan: () => void; onUpgrade: () => void }) {
  const t = useTranslations("Marketing.header");
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  return <header className="site-header"><div className="shell header-inner"><a href="#top" aria-label={t("logo_aria")}><Wordmark /></a><nav id="primary-navigation" className={open ? "main-nav is-open" : "main-nav"} aria-label={locale === "is" ? "Aðalvalmynd" : "Main navigation"}>{["threat","workflow","features","pricing"].map(key=><a key={key} href={`#${key}`} onClick={()=>setOpen(false)}>{t(key)}</a>)}<button type="button" onClick={onUpgrade}>{t("saas")}</button></nav><div className="header-actions"><LanguageSwitcher/><button className="button primary nav-cta" onClick={onScan}>{t("cta_scan_short")}<ArrowRight size={16}/></button><button className="menu-button" aria-expanded={open} aria-controls="primary-navigation" aria-label={locale === "is" ? "Valmynd" : "Menu"} onClick={()=>setOpen(!open)}>{open ? <X/> : <Menu/>}</button></div></div></header>;
}

function SectionHead({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="section-head"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="section-description">{text}</p></div>;
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
    <aside aria-live="polite" className="scanner-card overflow-hidden rounded border border-line-strong bg-card shadow-editorial">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-paper-soft px-4 py-3">
        <ShieldCheck className="h-5 w-5 text-brand-ink" aria-hidden="true" />
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
                <input id="domain" disabled={scanState === "scanning"} ref={inputRef} value={domain} onChange={(event) => setDomain(event.target.value)} className="min-h-14 rounded border border-line-strong bg-paper px-4 font-mono text-base text-ink outline-none transition placeholder:text-ink-300 focus:border-brand focus:ring-4 focus:ring-brand-soft" placeholder={t("placeholder")} autoComplete="off" inputMode="url" spellCheck={false} aria-invalid={scanState === "error" ? "true" : undefined} aria-describedby={scanState === "error" ? "domain-error" : undefined} />
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
              {scanState === "scanning" ? <p role="status" className="mt-5 text-sm text-ink-500">{t("waiting")}</p> : null}
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
  const locale = useLocale();
  const view = presentScan(result, locale);
  const spfFinding = view.spf;
  const dmarcFinding = view.dmarc;

  return (
    <div>
      <div className={`rounded border p-5 ${toneClasses(tone)}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em]">{result.assessment?.incomplete ? t("incomplete") : t("badge")}</p>
            <h2 className="mt-3 text-6xl font-extrabold tracking-tight">{grade}</h2>
          </div>
          {tone === "pass" ? <ShieldCheck className="h-9 w-9" /> : tone === "warn" ? <AlertTriangle className="h-9 w-9" /> : <ShieldAlert className="h-9 w-9" />}
        </div>
        <p className="mt-4 font-mono text-sm">{result.domain}</p>
        <p className="mt-3 text-sm leading-6">{view.message}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <ResultStat label={t("stats.status")} value={view.status} />
          <ResultStat label={t("stats.risk")} value={view.risk} />
          <ResultStat label={t("stats.time")} value={view.durationLabel} />
        </div>
        <p className="mt-4 text-xs leading-5 opacity-80">{view.sourceLabel} · {t("stats.checked_at", { date: view.checkedLabel })}. {view.evidenceDetail}</p>
      </div>
      <div className="mt-5 grid gap-4">
        <TechnicalFinding title={t("findings.spf")} tone={spfFinding.tone} headline={spfFinding.headline} detail={spfFinding.detail} record={result.spf.record} />
        <TechnicalFinding title={t("findings.dmarc")} tone={dmarcFinding.tone} headline={dmarcFinding.headline} detail={dmarcFinding.detail} record={result.dmarc.record} />
        {result.assessment ? <article className="rounded border border-line bg-card p-4"><h3 className="font-semibold">{t("findings.dkim")}</h3><p className="mt-2 text-sm text-ink-500">{view.dkim}</p><p className="mt-2 text-sm text-ink-500">{t("dkim_limit")}</p></article> : null}
        <article className="rounded border border-line bg-paper p-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-brand-ink">{t("sequence.label")}</p>
          <h3 className="mt-3 text-xl font-bold tracking-tight">{view.summary}</h3>
          <ol className="mt-4 grid gap-2">
            {view.steps.map((step, index) => <li key={step.title} className="rounded border border-line bg-card p-3 text-sm"><span className="font-mono text-brand-ink">{index + 1}.</span> <strong>{step.title}</strong> — <span className="text-ink-500">{step.detail}</span></li>)}
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
  const t = useTranslations("Marketing.results");
  const mappedTone = tone === "warning" ? "warn" : tone;
  return (
    <article className="rounded border border-line bg-card p-4">
      <div className="flex items-start justify-between gap-4">
        <div><p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink-500">{title}</p><h3 className={`mt-2 font-bold ${mappedTone === "fail" ? "text-fail-ink" : mappedTone === "warn" ? "text-warn-ink" : "text-pass-ink"}`}>{headline}</h3>{detail ? <p className="mt-2 text-sm leading-6 text-ink-500">{detail}</p> : null}</div>
        {mappedTone === "fail" ? <ShieldAlert className="h-5 w-5 shrink-0 text-fail-ink" /> : mappedTone === "warn" ? <AlertTriangle className="h-5 w-5 shrink-0 text-warn-ink" /> : <CheckCircle2 className="h-5 w-5 shrink-0 text-pass-ink" />}
      </div>
      <pre className="mt-4 overflow-x-auto whitespace-pre-wrap break-words rounded bg-midnight p-3 font-mono text-xs leading-6 text-white">{record || t("no_record")}</pre>
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
          <button type="button" aria-pressed={!protectedMode} onClick={() => setProtectedMode(false)} className={`rounded px-3 py-3 text-sm font-semibold transition ${!protectedMode ? "bg-fail-ink text-white" : "text-ink-500"}`}>{t("toggle_off")}</button>
          <button type="button" aria-pressed={protectedMode} onClick={() => setProtectedMode(true)} className={`rounded px-3 py-3 text-sm font-semibold transition ${protectedMode ? "bg-pass-ink text-white" : "text-ink-500"}`}>{t("toggle_on")}</button>
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
          <Wordmark />
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

