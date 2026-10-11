"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  ExternalLink,
  Globe2,
  LayoutGrid,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import {
  encodeWorkspace,
  maxSavedDomains,
  mergeWorkspaces,
  parseWorkspace,
  readWorkspaceCookie,
  setupSteps,
  workspaceCookie,
  workspaceKey,
  writeWorkspaceCookie,
  type SavedDomain,
  type SetupStep,
} from "@/lib/domain-workspace";
import { validSelector } from "@/lib/authentication-records";
import { validateScannableDomain, type ScanPayload } from "@/lib/scan";
import { DomainGuidance } from "@/components/domain-guidance";
import {
  domainReadiness,
  parseScoreCache,
  scoreCacheKey,
  type ScoreSnapshot,
} from "@/lib/domain-readiness";
import { presentScan } from "@/lib/scan-presentation";
import { AuthenticationFindings } from "@/components/authentication-findings";
import { trackPrivacyEvent } from "@/lib/privacy-events";

type Account = {
  authenticated: boolean;
  email?: string;
  csrf: string;
  available: boolean;
};
type View = "overview" | "domain" | "guide";
type Tab = "summary" | "records" | "setup";

export function DmarkApp() {
  const t = useTranslations("App");
  const w = useTranslations("Workspace");
  const locale = useLocale();
  const pathname = usePathname();
  const [domains, setDomains] = useState<SavedDomain[]>([]);
  const guest = useRef<SavedDomain[]>([]);
  const [selected, setSelected] = useState("");
  const [view, setView] = useState<View>("overview");
  const [tab, setTab] = useState<Tab>("summary");
  const [input, setInput] = useState("");
  const [filter, setFilter] = useState("");
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState<Record<string, ScanPayload>>({});
  const [observedAt, setObservedAt] = useState(0);
  const [scores, setScores] = useState<Record<string, ScoreSnapshot>>({});
  const [busy, setBusy] = useState("");
  const controller = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [version, setVersion] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [imported, setImported] = useState(false);
  const [email, setEmail] = useState("");
  const [emailState, setEmailState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );
  const [authError, setAuthError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

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
    guest.current = initial;
    setDomains(initial);
    setReady(true);
    const params = new URLSearchParams(location.search);
    if (params.get("account") === "link-error") setNotice(t("link_error"));
    if (params.has("account"))
      history.replaceState(null, "", location.pathname);
    const abort = new AbortController();
    async function loadAccount() {
      try {
        const response = await fetch("/api/account/me/", {
          cache: "no-store",
          signal: abort.signal,
        });
        if (!response.ok) throw Error("account");
        const me: Account = await response.json();
        if (me.authenticated) {
          const stored = await fetch("/api/account/workspace/", {
            cache: "no-store",
            signal: abort.signal,
          });
          if (!stored.ok) throw Error("workspace");
          const data = await stored.json();
          setDomains(parseWorkspace(JSON.stringify(data.domains)));
          setVersion(data.version);
          setImportCount(guest.current.length);
        }
        setAccount(me);
      } catch {
        if (!abort.signal.aborted)
          setAccount({ authenticated: false, available: false, csrf: "" });
      }
    }
    void loadAccount();
    return () => {
      abort.abort();
      controller.current?.abort();
    };
  }, [t]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const current = domains.find((item) => item.domain === selected);
  const result =
    current &&
    scores[current.domain]?.selector === (current.selector?.trim() || "")
      ? results[current.domain]
      : undefined;
  const filtered = domains.filter((item) =>
    item.domain.includes(filter.toLowerCase().trim()),
  );
  const checked = domains.filter(
    (item) =>
      scores[item.domain] &&
      scores[item.domain].selector === (item.selector?.trim() || ""),
  ).length;
  const text = (en: string, is: string) => (locale === "en" ? en : is);

  function persist(next: SavedDomain[]) {
    if (saving) return false;
    setError("");
    setNotice("");
    if (account?.authenticated) {
      setDomains(next);
      setDirty(true);
      return true;
    }
    try {
      const value = encodeWorkspace(next);
      writeWorkspaceCookie(value);
      if (
        !document.cookie
          .split(";")
          .some((part) => part.trim() === `${workspaceCookie}=${value}`)
      )
        throw Error("COOKIE_BLOCKED");
      guest.current = next;
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
      guest.current = next;
      setDomains(next);
      setNotice(t("cookie_blocked"));
      return true;
    }
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = validateScannableDomain(input);
    if (value.error) {
      setError(t("invalid_domain"));
      return;
    }
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
    setTab("summary");
    setInput("");
    setError("");
    void scan(existing || { domain: value.domain, completed: [] });
  }
  function select(domain: string) {
    setSelected(domain);
    setView("domain");
    setTab("summary");
    setError("");
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
  function toggle(step: SetupStep) {
    persist(
      domains.map((item) =>
        item.domain !== selected
          ? item
          : {
              ...item,
              completed: item.completed.includes(step)
                ? item.completed.filter((x) => x !== step)
                : [...item.completed, step],
            },
      ),
    );
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
  async function saveAccount() {
    if (!account?.authenticated || saving) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/account/workspace/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": account.csrf,
        },
        body: JSON.stringify({ domains, version }),
      });
      if (response.status === 409) throw Error("save_conflict");
      if (!response.ok) throw Error("save_failed");
      const data = await response.json();
      setVersion(data.version);
      setDirty(false);
      setNotice(t("saved_account"));
      if (imported) {
        writeWorkspaceCookie("", true);
        guest.current = [];
        setImportCount(0);
        setImported(false);
      }
    } catch (e) {
      setError(
        t(
          e instanceof Error && e.message === "save_conflict"
            ? "save_conflict"
            : "save_failed",
        ),
      );
    } finally {
      setSaving(false);
    }
  }
  function importGuest() {
    if (saving) return;
    try {
      const next = mergeWorkspaces(domains, guest.current);
      setDomains(next);
      setDirty(true);
      setImported(true);
      setNotice(t("import_ready"));
    } catch {
      setError(t("domain_limit", { count: maxSavedDomains }));
    }
  }
  async function signOut() {
    if (!account) return;
    setError("");
    const response = await fetch("/api/account/logout/", {
      method: "POST",
      headers: { "X-CSRF-Token": account.csrf },
    }).catch(() => null);
    if (!response?.ok) {
      setError(t("save_failed"));
      return;
    }
    setAccount({ authenticated: false, available: true, csrf: "" });
    setDomains(guest.current);
    setResults({});
    setSelected("");
    setView("overview");
    setDirty(false);
  }
  function openAccount() {
    setAuthError("");
    setEmailState("idle");
    dialog.current?.showModal();
  }
  async function startLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailState("sending");
    setAuthError("");
    try {
      const meResponse = await fetch("/api/account/me/", { cache: "no-store" });
      if (!meResponse.ok) throw Error("unavailable");
      const me: Account = await meResponse.json();
      if (!me.available || !me.csrf) throw Error("unavailable");
      setAccount(me);
      const response = await fetch("/api/account/start/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": me.csrf,
        },
        body: JSON.stringify({ email, locale }),
      });
      if (!response.ok)
        throw Error(response.status === 429 ? "rate" : "unavailable");
      setEmailState("sent");
    } catch (e) {
      setAuthError(
        t(
          e instanceof Error && e.message === "rate"
            ? "login_rate"
            : "account_unavailable",
        ),
      );
      setEmailState("idle");
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
          <span>
            dmark<span>.</span>
          </span>
          <span className="app-logo-tag">by Kastro</span>
        </button>
        <div className="sidebar-caption">{t("workspace")}</div>
        <nav aria-label={t("navigation")} className="app-nav">
          <button
            className={view !== "guide" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            <LayoutGrid size={18} />
            {t("my_domains")}
            <span>{domains.length}</span>
          </button>
          <button
            className={view === "guide" ? "active" : ""}
            onClick={() => setView("guide")}
          >
            <BookOpen size={18} />
            {t("setup_guide")}
          </button>
        </nav>
        <div className="sidebar-domains">
          <div className="sidebar-caption">{t("domains")}</div>
          {domains.map((item) => (
            <button
              key={item.domain}
              className={
                view === "domain" && item.domain === selected ? "selected" : ""
              }
              onClick={() => select(item.domain)}
            >
              <Globe2 size={15} />
              <span>{item.domain}</span>
              <ChevronRight size={14} />
            </button>
          ))}
          {!domains.length ? <p>{t("sidebar_empty")}</p> : null}
        </div>
        <div className="sidebar-bottom">
          <div className="guest-badge">
            <span className="status-dot" />
            {account?.authenticated
              ? t("account_workspace")
              : t("guest_workspace")}
          </div>
          <p>{account?.authenticated ? account.email : t("cookie_note")}</p>
          <a
            href={`https://kastro.is/${locale}/services/dmark`}
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
            {account?.authenticated ? (
              <>
                <button
                  className="app-button compact primary"
                  disabled={!dirty || saving}
                  onClick={() => void saveAccount()}
                >
                  {saving ? <Loader2 className="spin" size={15} /> : null}
                  {t("save_workspace")}
                </button>
                <button
                  className="app-text-button"
                  disabled={saving || dirty}
                  title={dirty ? t("unsaved") : undefined}
                  onClick={() => void signOut()}
                >
                  {t("sign_out")}
                </button>
              </>
            ) : (
              <button className="app-button compact dark" onClick={openAccount}>
                {t("create_account")}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </header>
        <main id="workspace" className="app-main" tabIndex={-1}>
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
          {account?.authenticated && importCount > 0 ? (
            <div className="import-banner">
              <div>
                <strong>{t("import_title", { count: importCount })}</strong>
                <p>{t("import_text")}</p>
              </div>
              <button className="app-button compact" onClick={importGuest}>
                {t("import_domains")}
              </button>
            </div>
          ) : null}
          {view === "overview" ? (
            <>
              <div className="app-page-heading">
                <div>
                  <p className="app-eyebrow">SPF / DKIM / DMARC / BIMI</p>
                  <h1>{t("my_domains")}</h1>
                  <p>{t("overview_text")}</p>
                </div>
                <span className="mode-pill">
                  {account?.authenticated
                    ? t("account_workspace")
                    : t("guest_workspace")}
                </span>
              </div>
              <form onSubmit={add} className="app-add-form">
                <label htmlFor="add-domain">{t("add_domain")}</label>
                <div>
                  <Globe2 size={19} />
                  <input
                    id="add-domain"
                    ref={inputRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    placeholder={t("domain_placeholder")}
                    disabled={!ready}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <button className="app-button dark" disabled={!ready}>
                    <Plus size={17} />
                    {t("add_domain")}
                  </button>
                </div>
                <p>{t("add_hint")}</p>
              </form>
              <div className="workspace-stats">
                <div>
                  <span>{t("saved_domains")}</span>
                  <strong>{domains.length.toString().padStart(2, "0")}</strong>
                </div>
                <div>
                  <span>{text("Domains with scores", "Lén með stig")}</span>
                  <strong>{checked.toString().padStart(2, "0")}</strong>
                </div>
                <div>
                  <span>{t("storage")}</span>
                  <strong className="stat-label">
                    {account?.authenticated ? t("account") : t("this_browser")}
                  </strong>
                </div>
              </div>
              {domains.length ? (
                <section className="domain-fleet">
                  <div className="fleet-heading">
                    <h2>{t("domain_list")}</h2>
                    <label className="domain-filter">
                      <Search size={16} />
                      <input
                        aria-label={t("filter_domains")}
                        placeholder={t("filter_domains")}
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                      />
                    </label>
                  </div>
                  <div className="domain-grid">
                    {filtered.map((item) => {
                      const score =
                        scores[item.domain]?.selector ===
                        (item.selector?.trim() || "")
                          ? scores[item.domain]
                          : undefined;
                      const stale =
                        score &&
                        observedAt - Date.parse(score.checkedAt) > 86400000;
                      return (
                        <article key={item.domain} className="domain-card">
                          <div className="domain-card-top">
                            <span className="domain-icon">
                              <Globe2 size={21} />
                            </span>
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
                          <div
                            className={`domain-score ${score?.score === 100 ? "perfect" : ""}`}
                          >
                            <strong>
                              {score?.score ?? "—"}
                              <small>/100</small>
                            </strong>
                            <span>
                              {text("DNS readiness", "DNS staða")}
                              <small>
                                {text(
                                  "SPF / DMARC grade",
                                  "SPF / DMARC einkunn",
                                )}
                                : {score?.grade || "—"}
                              </small>
                            </span>
                          </div>
                          <div className="domain-card-status">
                            <span
                              className={`status-dot ${results[item.domain] ? "checked" : ""}`}
                            />
                            {results[item.domain]
                              ? presentScan(results[item.domain], locale).status
                              : score
                                ? text(
                                    "Saved observation · recheck for live findings",
                                    "Vistuð athugun · athugaðu aftur fyrir nýjar niðurstöður",
                                  )
                                : t("not_checked")}
                          </div>
                          <div className="progress-track" aria-hidden="true">
                            <span style={{ width: `${score?.score ?? 0}%` }} />
                          </div>
                          <p className="score-checked">
                            {score
                              ? `${stale ? text("Older result · recheck", "Eldri niðurstaða · athugaðu aftur") : text("Last checked", "Síðast athugað")} · ${new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "is-IS", { dateStyle: "medium", timeStyle: "short" }).format(new Date(score.checkedAt))}`
                              : text(
                                  "Check DNS to get your score",
                                  "Athugaðu DNS til að fá stig",
                                )}
                          </p>
                          <button
                            className="app-text-button"
                            disabled={!!busy}
                            onClick={() => void scan(item)}
                          >
                            {busy === item.domain
                              ? t("checking")
                              : text("Refresh score", "Uppfæra stig")}
                          </button>
                          <div className="domain-card-bottom">
                            <span>
                              {t("tasks_done", {
                                count: item.completed.length,
                                total: 6,
                              })}
                            </span>
                            <button onClick={() => select(item.domain)}>
                              {text("Improve domain", "Bæta lénið")}
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                  {!filtered.length ? (
                    <p className="app-empty-small">{t("no_matches")}</p>
                  ) : null}
                </section>
              ) : (
                <section className="app-empty">
                  <span className="empty-illustration">
                    <Globe2 size={42} />
                    <span>
                      <Plus size={18} />
                    </span>
                  </span>
                  <h2>{t("empty_title")}</h2>
                  <p>{t("empty_text")}</p>
                  <button
                    className="app-button"
                    onClick={() => inputRef.current?.focus()}
                  >
                    {t("add_first")}
                    <ArrowRight size={17} />
                  </button>
                  <div className="empty-standards">
                    <span>SPF</span>
                    <span>DKIM</span>
                    <span>DMARC</span>
                    <span>BIMI</span>
                  </div>
                </section>
              )}
              {!account?.authenticated ? (
                <div className="account-nudge">
                  <ShieldCheck size={22} />
                  <div>
                    <strong>{t("nudge_title")}</strong>
                    <p>{t("nudge_text")}</p>
                  </div>
                  <button className="app-text-button" onClick={openAccount}>
                    {t("create_account")}
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : dirty ? (
                <p className="unsaved-note">{t("unsaved")}</p>
              ) : null}
            </>
          ) : view === "domain" && current ? (
            <>
              <div className="app-page-heading">
                <div>
                  <button
                    className="back-link"
                    onClick={() => setView("overview")}
                  >
                    {t("back_domains")}
                  </button>
                  <h1 className="domain-title">{current.domain}</h1>
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
                  <button
                    className="app-button dark"
                    disabled={!!busy}
                    onClick={() => void scan()}
                  >
                    {busy === current.domain ? (
                      <Loader2 className="spin" size={17} />
                    ) : (
                      <Search size={17} />
                    )}{" "}
                    {busy === current.domain
                      ? t("checking")
                      : t("check_domain")}
                  </button>
                </div>
              </div>
              <div
                className="app-tabs"
                role="tablist"
                aria-label={t("domain_sections")}
              >
                {(["summary", "records", "setup"] as Tab[]).map((value) => (
                  <button
                    key={value}
                    id={`tab-${value}`}
                    role="tab"
                    aria-selected={tab === value}
                    aria-controls={`panel-${value}`}
                    tabIndex={tab === value ? 0 : -1}
                    onClick={() => setTab(value)}
                    onKeyDown={(event) => {
                      if (
                        event.key === "ArrowLeft" ||
                        event.key === "ArrowRight"
                      ) {
                        event.preventDefault();
                        const values: Tab[] = ["summary", "records", "setup"];
                        const next =
                          values[
                            (values.indexOf(value) +
                              (event.key === "ArrowRight" ? 1 : 2)) %
                              3
                          ];
                        setTab(next);
                        document.getElementById(`tab-${next}`)?.focus();
                      }
                    }}
                  >
                    {t(`tabs.${value}`)}
                  </button>
                ))}
              </div>
              <section
                id={`panel-${tab}`}
                role="tabpanel"
                aria-labelledby={`tab-${tab}`}
              >
                {tab === "setup" ? (
                  <>
                    <label className="guided-selector">
                      {t("selector")}
                      <input
                        aria-label={text(
                          "Guided DKIM selector",
                          "DKIM selector í leiðsögn",
                        )}
                        value={current.selector || ""}
                        onChange={(event) =>
                          updateSelector(event.target.value.trim())
                        }
                        placeholder="selector1"
                      />
                    </label>
                    {result ? (
                      <DomainGuidance
                        result={result}
                        busy={!!busy}
                        onRecheck={() => void scan()}
                      />
                    ) : (
                      <div className="next-step-panel">
                        <div>
                          <h2>
                            {text(
                              "Start with a DNS check",
                              "Byrjaðu á DNS athugun",
                            )}
                          </h2>
                          <p>
                            {text(
                              "Your personalised guide uses the current findings to show what to fix and how to verify it.",
                              "Leiðsögnin notar núverandi niðurstöður til að sýna hvað þarf að laga og hvernig á að staðfesta það.",
                            )}
                          </p>
                        </div>
                        <button
                          className="app-button dark"
                          disabled={!!busy}
                          onClick={() => void scan()}
                        >
                          {busy ? t("checking") : t("check_domain")}
                        </button>
                      </div>
                    )}
                    <h2 className="manual-notes-heading">
                      {text(
                        "Your preparation notes",
                        "Undirbúningsathugasemdir þínar",
                      )}
                    </h2>
                    <div className="setup-layout">
                      <div className="setup-task-list">
                        {setupSteps.map((step, i) => (
                          <article
                            className={
                              current.completed.includes(step) ? "done" : ""
                            }
                            key={step}
                          >
                            <label>
                              <input
                                type="checkbox"
                                checked={current.completed.includes(step)}
                                onChange={() => toggle(step)}
                              />
                              <span className="task-number">
                                {(i + 1).toString().padStart(2, "0")}
                              </span>
                              <strong>{w(`steps.${step}.title`)}</strong>
                            </label>
                            <p>{w(`steps.${step}.detail`)}</p>
                          </article>
                        ))}
                      </div>
                      <aside className="setup-note">
                        <BookOpen size={22} />
                        <h2>{t("your_progress")}</h2>
                        <strong className="setup-count">
                          {current.completed.length}
                          <span>/6</span>
                        </strong>
                        <p>{w("manual")}</p>
                        <button
                          className="app-text-button"
                          onClick={() => setView("guide")}
                        >
                          {t("official_guides")}
                          <ArrowRight size={15} />
                        </button>
                      </aside>
                    </div>
                  </>
                ) : (
                  <>
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
                    {busy === current.domain ? (
                      <div className="checking-panel" role="status">
                        <Loader2 size={28} className="spin" />
                        <h2>{t("checking_records")}</h2>
                        <p>{t("checking_note")}</p>
                      </div>
                    ) : result ? (
                      <ScanView
                        result={result}
                        records={tab === "records"}
                        onSetup={() => setTab("setup")}
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
                  </>
                )}
              </section>
              {dirty ? <p className="unsaved-note">{t("unsaved")}</p> : null}
            </>
          ) : (
            <>
              <div className="app-page-heading">
                <div>
                  <p className="app-eyebrow">{t("reference")}</p>
                  <h1>{t("setup_guide")}</h1>
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
          <footer className="app-footer">
            <span>{t("free_by_kastro")}</span>
            <span>{t("checks_note")}</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="account-dialog"
        aria-labelledby="account-dialog-title"
      >
        <button
          type="button"
          className="dialog-close icon-button"
          onClick={() => dialog.current?.close()}
          aria-label={t("close")}
        >
          <X size={20} />
        </button>
        <span className="account-icon">
          <ShieldCheck size={28} />
        </span>
        <p className="app-eyebrow">{t("free_account")}</p>
        <h2 id="account-dialog-title">{t("account_title")}</h2>
        <p>{t("account_text")}</p>
        {emailState === "sent" ? (
          <div className="email-sent" role="status">
            <Check size={22} />
            <strong>{t("email_sent")}</strong>
            <p>{t("email_sent_text")}</p>
          </div>
        ) : (
          <form onSubmit={startLogin}>
            <label htmlFor="account-email">{t("email")}</label>
            <input
              id="account-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              maxLength={254}
              autoComplete="email"
              placeholder="you@company.is"
            />
            <button
              className="app-button dark"
              disabled={emailState === "sending"}
            >
              {emailState === "sending" ? (
                <Loader2 size={17} className="spin" />
              ) : null}
              {t("send_link")}
              <ArrowRight size={17} />
            </button>
          </form>
        )}
        {authError ? (
          <p className="app-error" role="alert">
            {authError}
          </p>
        ) : null}
        <p className="account-privacy">{t("account_privacy")}</p>
        <button
          className="app-text-button"
          onClick={() => dialog.current?.close()}
        >
          {t("continue_guest")}
        </button>
      </dialog>
    </div>
  );
}

function ScanView({
  result,
  records,
  onSetup,
}: {
  result: ScanPayload;
  records: boolean;
  onSetup: () => void;
}) {
  const t = useTranslations("App");
  const auth = useTranslations("Authentication");
  const locale = useLocale();
  const view = presentScan(result, locale);
  const readiness = domainReadiness(result, locale);
  const text = (en: string, is: string) => (locale === "en" ? en : is);
  if (records)
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
  return (
    <>
      <div className="scan-summary">
        <div className="scan-grade">
          <span>{text("DNS readiness", "DNS staða")}</span>
          <strong>
            {readiness.score ?? "—"}
            <small>/100</small>
          </strong>
          <small>
            {t("spf_dmarc_rating")}: {result.audit?.grade || "—"}
          </small>
        </div>
        <div>
          <span className="mode-pill">{view.status}</span>
          <h2>{t("observed_configuration")}</h2>
          <p>{view.message}</p>
          <small>
            {view.sourceLabel} · {view.checkedLabel}
          </small>
        </div>
      </div>
      <div className="protocol-grid">
        <article>
          <span>SPF</span>
          <h3>{view.spf.headline}</h3>
          <p>{view.spf.detail}</p>
        </article>
        <article>
          <span>DMARC</span>
          <h3>{view.dmarc.headline}</h3>
          <p>{t("record_note")}</p>
        </article>
        <article>
          <span>DKIM</span>
          <h3>
            {result.authentication?.dkim
              ? t("selector_checked")
              : t("common_selectors")}
          </h3>
          <p>
            {result.authentication?.dkim
              ? auth(`states.${result.authentication.dkim.state}`)
              : view.dkim}
          </p>
        </article>
        <article>
          <span>BIMI</span>
          <h3>{t("optional_branding")}</h3>
          <p>{t("bimi_summary")}</p>
        </article>
      </div>
      <div className="next-step-panel">
        <BookOpen size={24} />
        <div>
          <h2>{t("next_step")}</h2>
          <p>
            {readiness.next?.title ||
              text(
                "All assessed DNS checks pass. Verify real-mail alignment and keep reviewing reports.",
                "Allar metnar DNS athuganir standast. Staðfestu samsvörun í raunverulegum pósti og yfirfarðu skýrslur áfram.",
              )}
          </p>
        </div>
        <button className="app-button" onClick={onSetup}>
          {text("Follow the guided plan", "Fylgja leiðsögn")}
          <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}
