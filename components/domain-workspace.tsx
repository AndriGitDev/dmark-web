"use client";

import { FormEvent, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { maxSavedDomains, parseWorkspace, setupSteps, workspaceKey, type SavedDomain, type SetupStep } from "@/lib/domain-workspace";
import { validateScannableDomain } from "@/lib/scan";

export function DomainWorkspace({ onScan, busy }: { onScan: (domain: string) => void; busy: boolean }) {
  const t = useTranslations("Workspace");
  const [domains, setDomains] = useState<SavedDomain[]>([]);
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState("");
  const [error, setError] = useState("");
  const [storageFailed, setStorageFailed] = useState(false);
  const [ready, setReady] = useState(false);

  // Restore browser-only data after hydration; SSR must render the same empty state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const saved = parseWorkspace(localStorage.getItem(workspaceKey));
      setDomains(saved);
      setSelected(saved[0]?.domain ?? "");
    } catch { setStorageFailed(true); }
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const current = domains.find(item => item.domain === selected);
  function persist(next: SavedDomain[]) {
    setDomains(next);
    try {
      if (next.length) localStorage.setItem(workspaceKey, JSON.stringify(next));
      else localStorage.removeItem(workspaceKey);
      setStorageFailed(false);
    } catch { setStorageFailed(true); }
  }
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = validateScannableDomain(input);
    if (value.error) { setError(t("invalid")); return; }
    if (domains.some(item => item.domain === value.domain)) { setSelected(value.domain); setInput(""); setError(""); return; }
    if (domains.length >= maxSavedDomains) { setError(t("limit", { count: maxSavedDomains })); return; }
    persist([...domains, { domain: value.domain, completed: [] }]);
    setSelected(value.domain); setInput(""); setError("");
  }
  function remove(domain: string) {
    const next = domains.filter(item => item.domain !== domain);
    persist(next);
    if (selected === domain) setSelected(next[0]?.domain ?? "");
  }
  function toggle(step: SetupStep) {
    persist(domains.map(item => item.domain !== selected ? item : { ...item, completed: item.completed.includes(step)
      ? item.completed.filter(value => value !== step) : [...item.completed, step] }));
  }

  return <section id="domains" className="section light-section">
    <div className="shell">
      <div className="section-head"><p className="eyebrow">{t("eyebrow")}</p><h2>{t("title")}</h2><p className="section-description">{t("text")}</p></div>
      <p className="mt-4 text-sm text-ink-500">{t("privacy")}</p>
      {storageFailed ? <p role="status" className="mt-3 text-warn-ink">{t("storage_failed")}</p> : null}
      <form onSubmit={add} className="mt-6 flex max-w-xl flex-col gap-3 sm:flex-row">
        <label className="sr-only" htmlFor="saved-domain">{t("domain")}</label>
        <input id="saved-domain" value={input} onChange={event => setInput(event.target.value)} autoComplete="off" spellCheck={false} placeholder="fyrirtaeki.is" disabled={!ready} aria-invalid={!!error} aria-describedby={error ? "workspace-error" : undefined} className="min-h-12 min-w-0 flex-1 rounded border border-line-strong bg-card px-4 font-mono focus:ring-2 focus:ring-brand" />
        <button type="submit" disabled={!ready} className="button primary">{t("add")}</button>
      </form>
      {error ? <p id="workspace-error" role="alert" className="mt-3 text-fail-ink">{error}</p> : null}
      {domains.length ? <div className="mt-8 grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div><ul className="grid gap-3">{domains.map(item => <li key={item.domain} className="rounded border border-line bg-card p-4">
          <button type="button" aria-pressed={item.domain === selected} onClick={() => setSelected(item.domain)} className="break-all text-left font-semibold underline underline-offset-4">{item.domain}</button>
          <p className="mt-2 text-xs text-ink-500">{t("progress", { count: item.completed.length, total: setupSteps.length })}</p>
          <div className="mt-3 flex flex-wrap gap-4"><button type="button" disabled={busy} onClick={() => onScan(item.domain)} className="min-h-11 text-brand-ink underline disabled:opacity-50">{t("check")}</button><button type="button" onClick={() => remove(item.domain)} aria-label={t("remove_domain", { domain: item.domain })} className="min-h-11 text-ink-500 underline">{t("remove")}</button></div>
        </li>)}</ul><button type="button" onClick={() => { persist([]); setSelected(""); }} className="mt-4 min-h-11 text-ink-500 underline">{t("clear")}</button></div>
        {current ? <div className="rounded border border-line bg-card p-5 sm:p-6">
          <h3 className="break-all text-xl font-bold">{current.domain}</h3><p className="mt-3 text-sm leading-6 text-ink-500">{t("manual")}</p>
          <ol className="mt-5 grid gap-5">{setupSteps.map(step => <li key={step}>
            <label className="flex items-start gap-3 font-semibold"><input type="checkbox" checked={current.completed.includes(step)} onChange={() => toggle(step)} className="mt-1 h-5 w-5 shrink-0 accent-brand-ink" />{t(`steps.${step}.title`)}</label>
            <p className="ml-8 mt-2 text-sm leading-6 text-ink-500">{t(`steps.${step}.detail`)}</p>
          </li>)}</ol>
        </div> : null}
      </div> : <p className="mt-6 text-ink-500">{t("empty")}</p>}
    </div>
  </section>;
}
