"use client";
import { useState } from "react";
import { useLocale } from "next-intl";
import { ArrowRight, Check, Copy, ExternalLink, Loader2, Mail, RefreshCw } from "lucide-react";
import type { ScanPayload } from "@/lib/scan";
import { buildMailPlan, itMessage, type SetupRecord, type SetupStep } from "@/lib/mail-setup";

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    // Clipboard API can be blocked; fall back to a temporary selection.
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  }
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const locale = useLocale();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-button"
      aria-label={label}
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }
      }}
    >
      {copied ? <Check size={15} /> : <Copy size={15} />}
      <span aria-live="polite">{copied ? (locale === "en" ? "Copied" : "Afritað") : locale === "en" ? "Copy" : "Afrita"}</span>
    </button>
  );
}

function RecordTable({ records, domain }: { records: SetupRecord[]; domain: string }) {
  const locale = useLocale();
  const t = (en: string, is: string) => (locale === "en" ? en : is);
  return (
    <div className="record-list">
      {records.map((record) => (
        <div className="record-row" key={`${record.type}-${record.host}`}>
          <div className="record-field">
            <span>{t("Type", "Tegund")}</span>
            <strong>{record.type}</strong>
          </div>
          <div className="record-field">
            <span>{t("Name / Host", "Nafn / Host")}</span>
            <code>{record.host}</code>
            <CopyButton value={record.host} label={t(`Copy name ${record.host}`, `Afrita nafn ${record.host}`)} />
            <small>
              {record.host === "@"
                ? t(`@ means ${domain} itself. Some DNS hosts want it left empty.`, `@ þýðir ${domain} sjálft. Sumir DNS-hýsingaraðilar vilja reitinn tóman.`)
                : t(`Some DNS hosts want the full name: ${record.fqdn}`, `Sumir DNS-hýsingaraðilar vilja allt nafnið: ${record.fqdn}`)}
            </small>
          </div>
          <div className="record-field record-value">
            <span>{t("Value", "Gildi")}</span>
            {record.fromProvider ? (
              <em>{record.value}</em>
            ) : (
              <>
                <code>{record.value}</code>
                <CopyButton value={record.value} label={t(`Copy value for ${record.host}`, `Afrita gildi fyrir ${record.host}`)} />
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function StepBody({ step, domain, busy, onRecheck }: { step: SetupStep; domain: string; busy: boolean; onRecheck: () => void }) {
  const locale = useLocale();
  const t = (en: string, is: string) => (locale === "en" ? en : is);
  return (
    <div className="step-body">
      <p className="step-why">{step.why}</p>
      {step.wait && step.status !== "done" ? <p className="step-wait">{step.wait}</p> : null}
      <ol className="step-how">
        {step.how.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ol>
      {step.records.length ? <RecordTable records={step.records} domain={domain} /> : null}
      {step.links.length ? (
        <div className="step-links">
          {step.links.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.label}
              <ExternalLink size={14} />
            </a>
          ))}
        </div>
      ) : null}
      {step.status === "now" ? (
        <button className="app-button dark" disabled={busy} onClick={onRecheck}>
          {busy ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          {busy ? t("Checking…", "Athuga…") : t("I've done this, check again", "Ég er búin(n), athuga aftur")}
        </button>
      ) : null}
    </div>
  );
}

export function FixPlan({ result, busy, onRecheck }: { result: ScanPayload; busy: boolean; onRecheck: () => void }) {
  const locale = useLocale();
  const t = (en: string, is: string) => (locale === "en" ? en : is);
  const plan = buildMailPlan(result, locale);
  const message = itMessage(plan, locale);
  const subject = t(`Secure email for ${plan.domain}`, `Tryggja tölvupóst fyrir ${plan.domain}`);
  const statusLabel = {
    done: t("Done", "Komið"),
    now: t("Do this now", "Gerðu þetta núna"),
    later: t("Later", "Seinna"),
  };
  return (
    <div className="fix-plan">
      <section className={`verdict verdict-${plan.verdict}`} aria-labelledby="verdict-title">
        <div>
          <span className="verdict-light" aria-hidden="true" />
          <h2 id="verdict-title">{plan.headline}</h2>
          <p>{plan.detail}</p>
          <dl className="verdict-facts">
            <div>
              <dt>{t("Email provider", "Póstþjónusta")}</dt>
              <dd>{plan.providerLabel}</dd>
            </div>
            {plan.dnsHost ? (
              <div>
                <dt>{t("DNS managed at", "DNS er hjá")}</dt>
                <dd>{plan.dnsHost.name}</dd>
              </div>
            ) : null}
            <div>
              <dt>{t("Progress", "Framvinda")}</dt>
              <dd>{t(`${plan.done} of ${plan.total} steps`, `${plan.done} af ${plan.total} skrefum`)}</dd>
            </div>
          </dl>
        </div>
        <button className="app-button" disabled={busy} onClick={onRecheck}>
          {busy ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          {busy ? t("Checking…", "Athuga…") : t("Check again", "Athuga aftur")}
        </button>
      </section>

      {plan.verdict !== "protected" ? (
        <h2 className="steps-heading">
          {plan.steps.length === 1 ? t("Fix it in one step", "Lagaðu þetta í einu skrefi") : t(`Fix it in ${plan.total} steps`, `Lagaðu þetta í ${plan.total} skrefum`)}
        </h2>
      ) : (
        <h2 className="steps-heading">{t("Everything is in place", "Allt er komið")}</h2>
      )}
      <ol className="fix-steps">
        {plan.steps.map((step, index) => (
          <li key={step.id} className={`fix-step step-${step.status}`}>
            <details open={step.status === "now"}>
              <summary>
                <span className="step-number" aria-hidden="true">
                  {step.status === "done" ? <Check size={16} /> : index + 1}
                </span>
                <strong>{step.title}</strong>
                <span className="step-status">{statusLabel[step.status]}</span>
              </summary>
              <StepBody step={step} domain={plan.domain} busy={busy} onRecheck={onRecheck} />
            </details>
          </li>
        ))}
      </ol>

      {plan.verdict !== "protected" ? (
        <aside className="send-to-it">
          <div>
            <h3>{t("Someone else manages your domain?", "Sér einhver annar um lénið?")}</h3>
            <p>
              {t(
                "Send them a ready-written message with the exact records. Nothing is sent by dmark; it opens in your own email.",
                "Sendu þeim tilbúin skilaboð með nákvæmum færslum. Dmark sendir ekkert; skilaboðin opnast í þínum eigin pósti.",
              )}
            </p>
          </div>
          <div className="send-actions">
            <a className="app-button dark" href={`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}>
              <Mail size={16} />
              {t("Open in email", "Opna í tölvupósti")}
              <ArrowRight size={15} />
            </a>
            <CopyButton value={message} label={t("Copy message", "Afrita skilaboð")} />
          </div>
        </aside>
      ) : null}
    </div>
  );
}
