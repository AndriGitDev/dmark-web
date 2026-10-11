"use client";
import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import type { FlattenResult } from "@/lib/spf-flatten";

const explanations: Record<string, [string, string]> = {
  UNSUPPORTED_TERM: [
    "This record contains a mechanism or modifier we cannot safely flatten. Supported: positive ip4/ip6/includes, a final redirect, and -all/~all/?all. Macros, a, mx, ptr, exists, +all and non-positive mechanisms are refused.",
    "Færslan inniheldur virkni sem við getum ekki fletjað út á öruggan hátt. Stutt: jákvæð ip4/ip6/include, redirect í lok færslu og -all/~all/?all. Macros, a, mx, ptr, exists, +all og aðrar formerkingar eru ekki studdar.",
  ],
  UNSUPPORTED_TARGET: [
    "A dependency has an unsupported DNS name.",
    "Tilvísun hefur DNS heiti sem er ekki stutt.",
  ],
  INVALID_RECORD: [
    "The SPF record contains invalid syntax or an invalid IP range.",
    "SPF færslan inniheldur ógilda setningafræði eða IP svið.",
  ],
  MISSING_RECORD: [
    "A required SPF record is missing. No partial record will be generated.",
    "Nauðsynlega SPF færslu vantar. Ófullnægjandi færsla verður ekki búin til.",
  ],
  MULTIPLE_RECORDS: [
    "More than one SPF record was found at a DNS name. Repair the duplicate records first.",
    "Fleiri en ein SPF færsla fannst á DNS heiti. Lagaðu tvíteknar færslur fyrst.",
  ],
  LOOP: [
    "The SPF includes or redirects form a loop. Repair the original record first.",
    "SPF tilvísanir mynda lykkju. Lagaðu upprunalegu færsluna fyrst.",
  ],
  LIMIT: [
    "This SPF dependency graph is too large or took too long to resolve safely.",
    "SPF tilvísanirnar eru of umfangsmiklar eða tóku of langan tíma að leysa.",
  ],
  OUTPUT_TOO_LARGE: [
    "The flattened record exceeds our conservative 450-character limit. Keep provider includes or simplify verified senders. Do not split it into multiple SPF records.",
    "Útflatta færslan er yfir varfærnum 450 stafa mörkum. Haltu tilvísunum til veitenda eða einfaldaðu staðfesta sendendur. Ekki skipta henni í margar SPF færslur.",
  ],
  DNS_FAILED: [
    "DNS could not be resolved completely. Try again; no partial record has been generated.",
    "Ekki tókst að leysa allar DNS færslur. Reyndu aftur; engin ófullnægjandi færsla var búin til.",
  ],
};
export function SpfFlattenTool({
  domain,
  lookups,
}: {
  domain: string;
  lookups: number;
}) {
  const locale = useLocale();
  const text = (en: string, is: string) => (locale === "en" ? en : is);
  const [result, setResult] = useState<FlattenResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      controller.current?.abort();
      controller.current = null;
    },
    [],
  );
  async function generate() {
    if (controller.current) return;
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 16000);
    setBusy(true);
    setError("");
    setResult(null);
    setCopyNotice("");
    try {
      const response = await fetch("/api/spf/flatten/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok) {
        const explanation = explanations[data.code] || explanations.DNS_FAILED;
        setError(
          text(...explanation) +
            (data.target
              ? ` (${data.target}${data.term ? ` · ${data.term}` : ""})`
              : ""),
        );
        return;
      }
      if (
        data.domain !== domain ||
        typeof data.flattened !== "string" ||
        !Array.isArray(data.sources)
      )
        throw Error("invalid");
      setResult(data);
    } catch {
      if (!abort.signal.aborted || controller.current === abort)
        setError(text(...explanations.DNS_FAILED));
    } finally {
      clearTimeout(timer);
      if (controller.current === abort) {
        controller.current = null;
        setBusy(false);
      }
    }
  }
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyNotice(text("Copied.", "Afritað."));
    } catch {
      setCopyNotice(
        text(
          "Clipboard unavailable. Select and copy the record below, or download it.",
          "Ekki er hægt að afrita sjálfkrafa. Veldu og afritaðu færsluna hér fyrir neðan eða sæktu hana.",
        ),
      );
    }
  }
  function download() {
    if (!result) return;
    const content = `Domain: ${result.domain}\nGenerated: ${result.generatedAt}\nSnapshot only; regenerate when provider IPs change.\n\nOriginal:\n${result.original}\n\nFlattened:\n${result.flattened}\n\nOne TXT record, zone-file value:\n${result.zoneValue}\n\nSources:\n${result.sources.map((s) => `${s.network}\t${s.domain}\t${s.mechanism}`).join("\n")}\n`;
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `spf-${domain}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  }
  return (
    <details className="spf-flatten-tool" open={lookups >= 8}>
      <summary>
        <strong>
          {text(
            "Advanced SPF: generate a flattened record",
            "Ítarlegt SPF: búa til útflatta færslu",
          )}
        </strong>
        <span>{text("On demand", "Eftir þörfum")}</span>
      </summary>
      <div className="flatten-body">
        <p>
          {text(
            "Replace supported DNS dependencies with explicit IP ranges. Provider includes remain the default recommendation; flattening is an advanced option when the lookup budget becomes a problem.",
            "Skiptu studdum DNS tilvísunum út fyrir skýr IP svið. Tilvísanir til veitenda eru áfram ráðlagðar; útflöttun er ítarlegri valkostur þegar fjöldi uppflettinga verður vandamál.",
          )}
        </p>
        <p className="flatten-warning">
          {text(
            "You maintain this snapshot. Provider IP changes will not update your DNS automatically. Review authorised senders before replacing your current record, regenerate when providers change, and recheck DNS after publishing.",
            "Þú sérð um að viðhalda þessari stöðumynd. Breytt IP svið veitenda uppfæra ekki DNS sjálfkrafa. Yfirfarðu heimilaða sendendur áður en þú skiptir út núverandi færslu, búðu hana til aftur þegar veitendur breytast og athugaðu DNS eftir birtingu.",
          )}
        </p>
        <p className="sr-only" role="status">{busy ? text("Resolving SPF dependencies", "Leysi SPF tilvísanir") : result ? text("Flattened SPF candidate generated. Review before publishing.", "Tillaga að útflattri SPF færslu er tilbúin. Yfirfarðu hana áður en þú birtir.") : ""}</p>
        <button
          className="app-button dark"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy
            ? text("Resolving SPF…", "Leysi SPF…")
            : result
              ? text("Regenerate record", "Búa færslu til aftur")
              : text("Generate flattened SPF", "Búa til útflatta SPF færslu")}
        </button>
        {error ? (
          <p role="alert" className="flatten-error">
            {error}
          </p>
        ) : null}
        {result ? (
          <div className="flatten-result">
            <p>
              {text("Generated", "Búið til")}:{" "}
              {new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "is-IS", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "UTC",
              }).format(new Date(result.generatedAt))}{" "}
              UTC · {result.dependencies}{" "}
              {text("dependencies resolved", "tilvísanir leystar")}
            </p>
            <p>
              {result.lookupTerms}{" "}
              {text(
                "expanded include/redirect terms → 0 lookup-consuming terms in the generated record. This is a dependency count, not a live SPF delivery test.",
                "útvíkkaðar include/redirect tilvísanir → 0 virkniatriði sem nota DNS uppflettingar í nýju færslunni. Þetta er talning tilvísana, ekki prófun á raunverulegri póstafhendingu.",
              )}
            </p>
            <div className="flatten-comparison">
              <div>
                <h4>{text("Current DNS record", "Núverandi DNS færsla")}</h4>
                <pre>{result.original}</pre>
              </div>
              <div>
                <h4>
                  {text("Generated candidate", "Tillaga að nýrri færslu")}
                </h4>
                <pre>{result.flattened}</pre>
              </div>
            </div>
            <div className="flatten-actions">
              <button
                className="app-button"
                onClick={() => void copy(result.flattened)}
              >
                {text("Copy record", "Afrita færslu")}
              </button>
              <button className="app-button" onClick={download}>
                {text("Download snapshot", "Sækja stöðumynd")}
              </button>
            </div>
            {copyNotice ? <p role="status">{copyNotice}</p> : null}
            <details>
              <summary>
                {text("DNS zone-file format", "DNS zone-file snið")}
              </summary>
              <p>
                {text(
                  "Publish one TXT record at the domain root. If your DNS provider needs 255-character chunks, these quoted strings belong to the same TXT record. Follow its editor format; do not create a second SPF record.",
                  "Birtu eina TXT færslu á rót lénsins. Ef DNS veitandinn þarf 255 stafa hluta tilheyra þessir strengir sömu TXT færslunni. Fylgdu sniði ritilsins; ekki búa til aðra SPF færslu.",
                )}
              </p>
              <pre>{result.zoneValue}</pre>
              <button
                className="app-text-button"
                onClick={() => void copy(result.zoneValue)}
              >
                {text("Copy zone value", "Afrita zone gildi")}
              </button>
            </details>
            <details>
              <summary>
                {text(
                  "Where each IP range came from",
                  "Uppruni hvers IP sviðs",
                )}
              </summary>
              <ul>
                {result.sources.map((source, index) => (
                  <li key={index}>
                    <code>{source.network}</code>
                    <span>
                      {source.domain} · {source.mechanism}
                    </span>
                  </li>
                ))}
              </ul>
              {!result.sources.length ? (
                <p>
                  {text(
                    "This policy authorises no IP ranges.",
                    "Þessi stefna heimilar engin IP svið.",
                  )}
                </p>
              ) : null}
            </details>
            <p>
              {text(
                "Generation does not change your DNS or your domain score. Apply only after review, then use Recheck DNS to verify the published record.",
                "Útbúin færsla breytir hvorki DNS né stigum lénsins. Birtu hana aðeins eftir yfirferð og notaðu síðan Athuga DNS aftur til að staðfesta birtu færsluna.",
              )}
            </p>
          </div>
        ) : null}
      </div>
    </details>
  );
}
