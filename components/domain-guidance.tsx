"use client";
import { useLocale, useTranslations } from "next-intl";
import type { ScanPayload } from "@/lib/scan";
import { domainReadiness } from "@/lib/domain-readiness";

export function DomainGuidance({
  result,
  busy,
  onRecheck,
}: {
  result: ScanPayload;
  busy: boolean;
  onRecheck: () => void;
}) {
  const locale = useLocale();
  const auth = useTranslations("Authentication");
  const text = (en: string, is: string) => (locale === "en" ? en : is);
  const readiness = domainReadiness(result, locale);
  return (
    <div className="guided-plan">
      <div className="readiness-heading">
        <div>
          <span className="eyebrow">
            {text("YOUR PATH TO 100", "LEIÐIN AÐ 100")}
          </span>
          <h2>
            {readiness.score === 100
              ? text(
                  "All assessed DNS checks pass",
                  "Allar metnar DNS athuganir standast",
                )
              : text(
                  "Improve your domain, one step at a time",
                  "Bættu lénið, eitt skref í einu",
                )}
          </h2>
          <p>
            {text(
              "Five DNS checks, 20 points each. Rechecks update the score; manual notes do not. A score of 100 describes these DNS checks, not guaranteed delivery or protection.",
              "Fimm DNS athuganir, 20 stig hver. Ný athugun uppfærir stig; handvirkar athugasemdir gera það ekki. 100 stig lýsa þessum DNS athugunum, ekki tryggðum afhendingum eða vernd.",
            )}
          </p>
        </div>
        <strong className="readiness-total">
          {readiness.score ?? "—"}
          <small>/100</small>
        </strong>
      </div>
      {!readiness.complete ? (
        <p role="status">
          {text(
            "The lookup is incomplete. Resolve lookup errors and recheck before a score can be assigned.",
            "Uppfletting er ófullnægjandi. Leystu villur og athugaðu aftur áður en stig eru gefin.",
          )}
        </p>
      ) : null}
      <div className="next-step-panel">
        <div>
          <span className="eyebrow">{text("NEXT ACTION", "NÆSTA AÐGERÐ")}</span>
          <h3>
            {!readiness.complete
              ? text("Complete the DNS check", "Ljúka DNS athugun")
              : readiness.next?.title ||
                text(
                  "Verify real mail from every sender",
                  "Staðfesta raunverulegan póst frá öllum sendendum",
                )}
          </h3>
          <p>
            {readiness.next && readiness.complete
              ? readiness.next.action
              : text(
                  "Check authentication headers and review DMARC reports for every authorised sender. DNS publication alone does not confirm alignment or DKIM signatures.",
                  "Athugaðu auðkenningarhausa og DMARC skýrslur fyrir alla heimilaða sendendur. Birtar DNS færslur staðfesta ekki einar og sér samsvörun eða DKIM undirritun.",
                )}
          </p>
        </div>
        <button className="app-button dark" disabled={busy} onClick={onRecheck}>
          {busy
            ? text("Checking…", "Athuga…")
            : text("Recheck DNS", "Athuga DNS aftur")}
        </button>
      </div>

      <div className="guided-checks">
        {readiness.checks.map((check, index) => (
          <details
            key={check.id}
            open={check.id === readiness.next?.id}
            className={check.passed ? "verified" : "needs-work"}
          >
            <summary>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{check.title}</strong>
              <small>
                {check.passed
                  ? readiness.complete
                    ? text("Observed · +20", "Staðfest í athugun · +20")
                    : text("Observed", "Athugað")
                  : text("To verify · 20 pts", "Þarf að staðfesta · 20 stig")}
              </small>
            </summary>
            <div>
              <p>{check.action}</p>
              <code>{check.name}</code>
              <p className="verify-instruction">{check.verify}</p>
            </div>
          </details>
        ))}
      </div>
      <aside className="guided-bimi">
        <h3>
          {text("Optional next goal: BIMI", "Valfrjálst næsta markmið: BIMI")}
        </h3>
        <p>
          {text(
            "After authentication and enforcement are ready, follow your provider’s BIMI requirements for an SVG logo, HTTPS hosting and any certificate requirement. Dmark checks record publication only; it cannot validate the logo, certificate or inbox display. BIMI does not affect your score.",
            "Þegar auðkenning og framfylgd eru tilbúnar skaltu fylgja BIMI kröfum veitandans um SVG merki, HTTPS hýsingu og hugsanlegt vottorð. Dmark athugar aðeins birtingu færslu; það staðfestir ekki merki, vottorð eða birtingu í pósthólfi. BIMI hefur ekki áhrif á stig.",
          )}
        </p>
        <code>default._bimi.{result.domain}</code>
        <p>
          {text("Observed record: ", "Færsla í athugun: ")}
          {result.authentication?.bimi
            ? auth(`states.${result.authentication.bimi.state}`)
            : text("not checked", "ekki athugað")}
        </p>
        <a
          href="https://bimigroup.org/implementation-guide/"
          target="_blank"
          rel="noreferrer"
        >
          {text("BIMI implementation guide ↗", "BIMI leiðbeiningar ↗")}
        </a>
      </aside>
    </div>
  );
}
