"use client";

import { FormEvent, ReactNode, useEffect, useRef, useState } from "react";
import Image from "next/image";
import kastroYellow from "@/public/brand/kastro/star-yellow.png";
import kastroInk from "@/public/brand/kastro/star-ink.png";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  ExternalLink,
  Globe2,
  LayoutGrid,
  Loader2,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  encodeWorkspace,
  maxSavedDomains,
  parseWorkspace,
  readWorkspaceCookie,
  setupSteps,
  workspaceCookie,
  workspaceKey,
  writeWorkspaceCookie,
  type SavedDomain,
} from "@/lib/domain-workspace";
import { validSelector } from "@/lib/authentication-records";
import { validateScannableDomain, type ScanPayload } from "@/lib/scan";
import { DomainGuidance } from "@/components/domain-guidance";
import { FixPlan } from "@/components/fix-plan";
import { guidePath } from "@/lib/guides";
import { contentForLocale } from "@/lib/public-content";
import { buildMailPlan, type Verdict } from "@/lib/mail-setup";
import {
  domainReadiness,
  parseScoreCache,
  scoreCacheKey,
  type ScoreSnapshot,
} from "@/lib/domain-readiness";
import { presentScan } from "@/lib/scan-presentation";
import { AuthenticationFindings } from "@/components/authentication-findings";
import { trackPrivacyEvent } from "@/lib/privacy-events";

type View = "overview" | "domain" | "guide";

export function DmarkApp({ reference }: { reference: ReactNode }) {
  const t = useTranslations("App");
  const w = useTranslations("Workspace");
  const locale = useLocale();
  const pathname = usePathname();
  const [domains, setDomains] = useState<SavedDomain[]>([]);
  const [selected, setSelected] = useState("");
  const [view, setView] = useState<View>("overview");
  const [input, setInput] = useState("");
  const [domainInputError, setDomainInputError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const previousView = useRef("overview:");
  const [filter, setFilter] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Record<string, ScanPayload>>({});
  const [observedAt, setObservedAt] = useState(0);
  const [scores, setScores] = useState<Record<string, ScoreSnapshot>>({});
  const [busy, setBusy] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cookie hydration keeps the server and first browser render identical.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setObservedAt(Date.now());
    let initial = readWorkspaceCookie(document.cookie);
    try {
      setScores(parseScoreCache(localStorage.getItem(scoreCacheKey)));
    } catch {
      /* Scores still work in memory. */
    }
    try {
      if (
        !document.cookie
          .split(";")
          .some((part) => part.trim().startsWith(workspaceCookie + "="))
      ) {
        const old = parseWorkspace(localStorage.getItem(workspaceKey));
        if (old.length) {
          const value = encodeWorkspace(old);
          writeWorkspaceCookie(value);
          if (readWorkspaceCookie(document.cookie).length === old.length) {
            initial = old;
            localStorage.removeItem(workspaceKey);
          }
        }
      }
    } catch {
      /* Existing cookie data still works if old storage is blocked. */
    }
    setDomains(initial);
    setReady(true);
    return () => {
      controller.current?.abort();
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    const nextView = `${view}:${view === "domain" ? selected : ""}`;
    if (previousView.current !== nextView) {
      heading.current?.focus();
      previousView.current = nextView;
    }
    const label = view === "domain" ? selected : view === "guide" ? t("setup_guide") : null;
    document.title = label ? `${label} | dmark` : contentForLocale(locale).title;
  }, [view, selected, locale, t]);

  const current = domains.find((item) => item.domain === selected);
  const result =
    current &&
    scores[current.domain]?.selector === (current.selector?.trim() || "")
      ? results[current.domain]
      : undefined;
  const filtered = domains.filter((item) =>
    item.domain.includes(filter.toLowerCase().trim()),
  );
  const text = (en: string, is: string) => (locale === "en" ? en : is);
  const scoreFor = (item: SavedDomain) =>
    scores[item.domain]?.selector === (item.selector?.trim() || "") ? scores[item.domain] : undefined;
  const levelFor = (item: SavedDomain): Verdict =>
    results[item.domain] ? buildMailPlan(results[item.domain], locale).verdict : verdictFromGrade(scoreFor(item)?.grade);

  function persist(next: SavedDomain[]) {
    setError("");
    setNotice("");
    try {
      const value = encodeWorkspace(next);
      writeWorkspaceCookie(value);
      if (
        !document.cookie
          .split(";")
          .some((part) => part.trim() === `${workspaceCookie}=${value}`)
      )
        throw Error("COOKIE_BLOCKED");
      setDomains(next);
      return true;
    } catch (storageError) {
      if (
        storageError instanceof Error &&
        storageError.message === "COOKIE_LIMIT"
      ) {
        setError(t("cookie_limit"));
        return false;
      }
      setDomains(next);
      setNotice(t("cookie_blocked"));
      return true;
    }
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = validateScannableDomain(input);
    if (value.error) {
      setDomainInputError(t("invalid_domain"));
      inputRef.current?.focus();
      return;
    }
    setDomainInputError("");
    const existing = domains.find((item) => item.domain === value.domain);
    if (!existing && domains.length >= maxSavedDomains) {
      setError(t("domain_limit", { count: maxSavedDomains }));
      return;
    }
    if (
      !existing &&
      !persist([...domains, { domain: value.domain, completed: [] }])
    )
      return;
    setSelected(value.domain);
    setView("domain");
    setInput("");
    setError("");
    void scan(existing || { domain: value.domain, completed: [] });
  }
  function select(domain: string) {
    setSelected(domain);
    setView("domain");
    setError("");
    // Checks take a couple of seconds, so opening a domain always shows fresh results.
    const item = domains.find((entry) => entry.domain === domain);
    if (item && !results[domain] && !busy) void scan(item);
  }
  function remove(domain: string) {
    if (
      persist(domains.filter((item) => item.domain !== domain)) &&
      selected === domain
    ) {
      setSelected("");
      setView("overview");
    }
  }
  function updateSelector(value: string) {
    if (value !== current?.selector)
      setResults((previous) => {
        const next = { ...previous };
        delete next[selected];
        return next;
      });
    persist(
      domains.map((item) =>
        item.domain === selected ? { ...item, selector: value } : item,
      ),
    );
  }
  async function scan(target: SavedDomain | undefined = current) {
    if (!target || controller.current) return;
    const selector = target.selector?.trim() || "";
    if (selector && !validSelector(selector)) {
      setError(t("invalid_selector"));
      return;
    }
    const domain = target.domain;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(domain);
    setScanMessage("");
    setError("");
    const timeout = window.setTimeout(() => abort.abort(), 55000);
    trackPrivacyEvent("scan_start", { source: "live_scanner" });
    try {
      const response = await fetch("/api/scan/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain, selector }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw Error(
          data.code === "RATE_LIMITED" ? "rate_limited" : "scan_failed",
        );
      if (
        data.source !== "live" ||
        data.domain !== domain ||
        !data.spf ||
        !data.dmarc
      )
        throw Error("scan_failed");
      setObservedAt(Date.parse(data.checkedAt) || observedAt);
      setResults((previous) => ({ ...previous, [domain]: data }));
      const snapshot: ScoreSnapshot = {
        score: domainReadiness(data).score,
        grade: data.audit?.grade || "—",
        checkedAt: data.checkedAt || new Date(observedAt).toISOString(),
        selector,
      };
      setScores((previous) => ({ ...previous, [domain]: snapshot }));
      setScanMessage(buildMailPlan(data, locale).headline);
      try {
        const cached = parseScoreCache(localStorage.getItem(scoreCacheKey));
        cached[domain] = snapshot;
        localStorage.setItem(
          scoreCacheKey,
          JSON.stringify({ v: 1, scores: Object.entries(cached).slice(-20) }),
        );
      } catch {
        /* A blocked cache does not prevent checking a domain. */
      }
      trackPrivacyEvent("scan_complete", {
        source: "live_scanner",
        status: data.status,
      });
    } catch (e) {
      setError(
        t(
          abort.signal.aborted
            ? "scan_timeout"
            : e instanceof Error && e.message === "rate_limited"
              ? "rate_limited"
              : "scan_failed",
        ),
      );
    } finally {
      window.clearTimeout(timeout);
      setBusy("");
      controller.current = null;
    }
  }
  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">
        {t("skip")}
      </a>
      <aside className="app-sidebar">
        <button
          className="app-logo"
          onClick={() => setView("overview")}
          aria-label="Dmark"
        >
          <KastroStar className="logo-star" />
          <span className="app-wordmark">
            <span>dmark<span>.</span></span>
            <span className="app-logo-tag">by Kastro</span>
          </span>
        </button>
        <div className="sidebar-caption">{t("workspace")}</div>
        <nav aria-label={t("navigation")} className="app-nav">
          <button
            aria-current={view === "overview" ? "page" : undefined}
            className={view !== "guide" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            <LayoutGrid size={18} />
            {t("my_domains")}
            <span>{domains.length}</span>
          </button>
          <a href={guidePath(locale)}>
            <BookOpen size={18} />
            {t("setup_guide")}
          </a>
        </nav>
        <div className="sidebar-domains">
          <div className="sidebar-caption">{t("domains")}</div>
          {domains.map((item) => (
            <button
              key={item.domain}
              aria-label={item.domain}
              aria-current={view === "domain" && selected === item.domain ? "page" : undefined}
              className={
                view === "domain" && item.domain === selected ? "selected" : ""
              }
              onClick={() => select(item.domain)}
            >
              <span className={`status-dot dot-${levelFor(item)}`} />
              <span>{item.domain}</span>
            </button>
          ))}
          {!domains.length ? <p>{t("sidebar_empty")}</p> : null}
        </div>
        <div className="sidebar-bottom">
          <div className="guest-badge">
            <span className="status-dot" />
            {t("guest_workspace")}
          </div>
          <p>{t("cookie_note")}</p>
          <a
            href={`https://kastro.is/${locale}/contact`}
            target="_blank"
            rel="noreferrer"
          >
            {t("kastro_help")}
            <ExternalLink size={14} />
          </a>
        </div>
      </aside>
      <div className="app-body">
        <header className="app-topbar">
          <div className="breadcrumb">
            {t("workspace")}
            <ChevronRight size={14} />
            <strong>
              {view === "guide"
                ? t("setup_guide")
                : current && view === "domain"
                  ? current.domain
                  : t("my_domains")}
            </strong>
          </div>
          <div className="app-top-actions">
            <div className="app-language">
              <Link
                href={pathname}
                locale="is"
                aria-current={locale === "is" ? "page" : undefined}
              >
                IS
              </Link>
              <Link
                href={pathname}
                locale="en"
                aria-current={locale === "en" ? "page" : undefined}
              >
                EN
              </Link>
            </div>
            <span className="privacy-chip">
              <ShieldCheck size={15} aria-hidden="true" />
              {t("privacy_chip")}
            </span>
          </div>
        </header>
        <main id="workspace" className="app-main" tabIndex={-1}>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{busy ? t("checking_records") : scanMessage}</p>
          {notice ? (
            <div className="app-notice" role="status">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="app-error" role="alert">
              {error}
            </div>
          ) : null}
          {view === "overview" ? (
            <>
              <div className="app-page-heading overview-heading hero-check">
                <div>
                  <p className="app-eyebrow">{t("hero_eyebrow")}</p>
                  <h1 ref={heading} tabIndex={-1}>{t("hero_title")}</h1>
                  <p>{t("hero_text")}</p>
                </div>
                <KastroStar className="hero-star" />
              </div>
              <form onSubmit={add} className="app-add-form hero-form">
                <label htmlFor="add-domain">{t("hero_label")}</label>
                <div>
                  <Globe2 size={19} />
                  <input
                    id="add-domain"
                    ref={inputRef}
                    value={input}
                    onChange={(event) => { setInput(event.target.value); setDomainInputError(""); }}
                    placeholder={t("domain_placeholder")}
                    disabled={!ready}
                    autoComplete="off"
                    autoCapitalize="none"
                    inputMode="url"
                    maxLength={512}
                    aria-invalid={!!domainInputError}
                    aria-describedby={`add-domain-hint${domainInputError ? " add-domain-error" : ""}`}
                    spellCheck={false}
                  />
                  <button className="app-button dark" disabled={!ready}>
                    <Search size={17} />
                    {t("hero_button")}
                  </button>
                </div>
                <p id="add-domain-hint">{t("add_hint")}</p>
                {domainInputError ? <p id="add-domain-error" className="app-error" role="alert">{domainInputError}</p> : null}
              </form>
              {domains.length ? (
                <section className="domain-fleet" aria-labelledby="your-domains">
                  <div className="fleet-heading">
                    <h2 id="your-domains">{t("your_domains")}</h2>
                    {domains.length > 6 ? (
                      <label className="domain-filter">
                        <Search size={16} />
                        <input
                          aria-label={t("filter_domains")}
                          placeholder={t("filter_domains")}
                          value={filter}
                          onChange={(event) => setFilter(event.target.value)}
                        />
                      </label>
                    ) : null}
                  </div>
                  <div className="domain-grid">
                    {filtered.map((item) => {
                      const score = scoreFor(item);
                      const level = levelFor(item);
                      return (
                        <article key={item.domain} className={`domain-card card-${level}`}>
                          <div className="domain-card-top">
                            <span className={`verdict-pill pill-${level}`}>{t(`verdict_${level}`)}</span>
                            <button
                              className="icon-button"
                              aria-label={t("remove_domain", {
                                domain: item.domain,
                              })}
                              onClick={() => remove(item.domain)}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                          <button
                            className="domain-open"
                            onClick={() => select(item.domain)}
                          >
                            {item.domain}
                            <ArrowRight size={17} />
                          </button>
                          <p className="score-checked">
                            {score
                              ? `${text("Last checked", "Síðast athugað")} · ${new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "is-IS", { dateStyle: "medium", timeStyle: "short" }).format(new Date(score.checkedAt))}`
                              : t("not_checked")}
                          </p>
                          <button
                            className="app-text-button"
                            disabled={!!busy}
                            onClick={() => void scan(item)}
                          >
                            {busy === item.domain ? t("checking") : t("check_again")}
                          </button>
                        </article>
                      );
                    })}
                  </div>
                  {!filtered.length ? (
                    <p className="app-empty-small">{t("no_matches")}</p>
                  ) : null}
                </section>
              ) : null}
              <section className="how-it-works" aria-labelledby="how-title">
                <h2 id="how-title">{t("how_title")}</h2>
                <ol>
                  {[1, 2, 3].map((n) => (
                    <li key={n}>
                      <span aria-hidden="true">{n}</span>
                      <strong>{t(`how_${n}_title`)}</strong>
                      <p>{t(`how_${n}_text`)}</p>
                    </li>
                  ))}
                </ol>
              </section>
              <section className="privacy-card" aria-labelledby="privacy-card-title">
                <div>
                  <p className="app-eyebrow">{t("privacy_eyebrow")}</p>
                  <strong id="privacy-card-title">{t("privacy_title")}</strong>
                </div>
                <div className="privacy-points">
                  <p>{t("privacy_text")}</p>
                  <ul>
                    <li>{t("privacy_point_account")}</li>
                    <li>{t("privacy_point_storage")}</li>
                    <li>{t("privacy_point_lookup")}</li>
                  </ul>
                </div>
                <KastroStar className="privacy-star" variant="ink" />
              </section>
            </>
          ) : view === "domain" && current ? (
            <>
              <div className="app-page-heading domain-heading">
                <div>
                  <button
                    className="back-link"
                    onClick={() => setView("overview")}
                  >
                    {t("back_domains")}
                  </button>
                  <h1 ref={heading} tabIndex={-1} className="domain-title">{current.domain}</h1>
                  <p>
                    {result
                      ? t("last_checked", {
                          time: presentScan(result, locale).checkedLabel,
                        })
                      : t("domain_intro")}
                  </p>
                </div>
                <div className="domain-heading-actions">
                  <button
                    className="icon-button"
                    onClick={() => remove(current.domain)}
                    aria-label={t("remove_domain", { domain: current.domain })}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              {busy === current.domain && !result ? (
                <div className="checking-panel" role="status">
                  <Loader2 size={28} className="spin" />
                  <h2>{t("checking_records")}</h2>
                  <p>{t("checking_note")}</p>
                </div>
              ) : result ? (
                <FixPlan
                  result={result}
                  busy={busy === current.domain}
                  onRecheck={() => void scan()}
                />
              ) : (
                <div className="no-check-panel">
                  <ShieldCheck size={35} />
                  <h2>{t("ready_check")}</h2>
                  <p>{t("ready_check_text")}</p>
                  <button
                    className="app-button"
                    disabled={!!busy}
                    onClick={() => void scan()}
                  >
                    {t("check_domain")}
                    <ArrowRight size={16} />
                  </button>
                </div>
              )}
              <details className="tech-details">
                <summary>
                  {text("Technical details", "Tæknilegar upplýsingar")}
                  <small>{text("Raw records, DKIM selector, SPF tool, BIMI", "Hráar færslur, DKIM selector, SPF tól, BIMI")}</small>
                </summary>
                <div className="selector-settings">
                  <div>
                    <label htmlFor="domain-selector">{t("selector")}</label>
                    <p>{t("selector_help")}</p>
                  </div>
                  <input
                    id="domain-selector"
                    value={current.selector || ""}
                    onChange={(event) => updateSelector(event.target.value)}
                    maxLength={128}
                    placeholder="selector1"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {result ? (
                  <>
                    <RecordsView result={result} />
                    <DomainGuidance
                      result={result}
                      busy={!!busy}
                      onRecheck={() => void scan()}
                    />
                  </>
                ) : null}
              </details>
            </>
          ) : (
            <>
              <div className="app-page-heading">
                <div>
                  <p className="app-eyebrow">{t("reference")}</p>
                  <h1 ref={heading} tabIndex={-1}>{t("setup_guide")}</h1>
                  <p>{t("guide_intro")}</p>
                </div>
              </div>
              <div className="guide-grid">
                {setupSteps.map((step, i) => (
                  <article key={step}>
                    <span className="app-eyebrow">0{i + 1}</span>
                    <h2>{w(`steps.${step}.title`)}</h2>
                    <p>{w(`steps.${step}.detail`)}</p>
                  </article>
                ))}
              </div>
              <section className="official-guides">
                <h2>{t("official_guides")}</h2>
                {[
                  [
                    "Microsoft 365",
                    "https://learn.microsoft.com/en-us/defender-office-365/email-authentication-about",
                  ],
                  [
                    "Google Workspace",
                    "https://support.google.com/a/answer/174124",
                  ],
                  [
                    "Cloudflare DMARC",
                    "https://developers.cloudflare.com/dmarc-management/",
                  ],
                  ["BIMI Group", "https://bimigroup.org/implementation-guide/"],
                ].map(([label, url]) => (
                  <a key={label} href={url} target="_blank" rel="noreferrer">
                    {label}
                    <ExternalLink size={15} />
                  </a>
                ))}
              </section>
            </>
          )}
          {view === "overview" ? reference : null}
          <footer className="app-footer">
            <span>{t("free_by_kastro")}</span>
            <span>{t("checks_note")}</span>
            <nav aria-label={text("Policies and contact", "Skilmálar og samband")}>
              <a href={`https://kastro.is/${locale}/privacy`}>{text("Privacy", "Persónuvernd")}</a>
              <a href={`https://kastro.is/${locale}/terms`}>{text("Terms", "Skilmálar")}</a>
              <a href={`https://kastro.is/${locale}/security`}>{text("Report a vulnerability", "Tilkynna öryggisveikleika")}</a>
              <a href={`https://kastro.is/${locale}/contact`}>{text("Contact", "Hafa samband")}</a>
            </nav>
          </footer>
        </main>
      </div>
    </div>
  );
}

function RecordsView({ result }: { result: ScanPayload }) {
  const t = useTranslations("App");
  const locale = useLocale();
  const view = presentScan(result, locale);
  return (
    <div className="records-grid">
      <article className="record-panel">
        <h2>SPF</h2>
        <p>{view.spf.headline}</p>
        <pre>{result.spf.record || t("no_record")}</pre>
        <small>{view.spf.detail}</small>
      </article>
      <article className="record-panel">
        <h2>DMARC</h2>
        <p>{view.dmarc.headline}</p>
        <pre>{result.dmarc.record || t("no_record")}</pre>
        <small>{view.dmarc.detail || t("record_note")}</small>
      </article>
      <article className="record-panel">
        <h2>DKIM · {t("common_selectors")}</h2>
        <p>{view.dkim}</p>
        <small>{t("dkim_note")}</small>
      </article>
      {result.authentication ? (
        <AuthenticationFindings records={result.authentication} />
      ) : null}
    </div>
  );
}

/** Saved snapshots only keep the SPF/DMARC grade; map it to the same verdict words. */
function verdictFromGrade(grade: string | undefined): Verdict {
  if (grade === "A" || grade === "B") return "protected";
  if (grade === "C") return "almost";
  if (grade === "F") return "exposed";
  return "unknown";
}

function KastroStar({ className, variant = "yellow" }: { className: string; variant?: "yellow" | "ink" }) {
  return (
    <Image
      className={className}
      src={variant === "ink" ? kastroInk : kastroYellow}
      alt=""
      aria-hidden="true"
      sizes={className === "logo-star" ? "34px" : className === "hero-star" ? "210px" : "260px"}
    />
  );
}
