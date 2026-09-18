import type { ScanPayload } from "./scan";

/** Present structured evidence, never upstream English prose, in the selected language. */
export function presentScan(result: ScanPayload, locale: string) {
  const is = locale !== "en";
  const text = (icelandic: string, english: string) => is ? icelandic : english;
  const a = result.assessment;
  const incomplete = !!a?.incomplete;
  const spfTone = incomplete ? "warning" : !result.spf.valid ? "fail" : a?.spfState === "yellow" || result.spf.lookups >= 8 ? "warning" : "pass";
  const policy = result.dmarc.policy;
  const pct = a?.pct ?? 100;
  const dmarcTone = !result.dmarc.valid || policy === "none" ? "fail" : policy === "reject" && pct === 100 ? "pass" : "warning";
  const risk = result.audit?.risk ?? "unknown";
  const riskLabels: Record<string, string> = is
    ? {low: "Lág", medium: "Miðlungs", high: "Há", critical: "Alvarleg", unknown: "Ómetin"}
    : {low: "Low", medium: "Medium", high: "High", critical: "Critical", unknown: "Unknown"};
  const checked = result.checkedAt ? new Date(result.checkedAt) : null;
  const checkedLabel = checked && Number.isFinite(checked.getTime())
    ? new Intl.DateTimeFormat(is ? "is-IS" : "en-GB", {dateStyle: "medium", timeStyle: "short", timeZone: "UTC"}).format(checked) + " UTC"
    : text("Ekki skráð", "Not reported");
  return {
    status: incomplete ? text("Ólokið", "Incomplete") : result.status === "PASS" ? text("Stenst", "Pass") : result.status === "FAIL" ? text("Þarfnast úrbóta", "Needs attention") : text("Athugasemdir", "Warnings"),
    risk: riskLabels[risk] ?? riskLabels.unknown,
    message: incomplete
      ? text("Ekki tókst að ljúka öllum DNS-uppflettingum. Heildareinkunn birtist þegar næg gögn liggja fyrir. Færslurnar sem fundust eru sýndar hér fyrir neðan.", "Some DNS lookups could not be completed. No overall grade is assigned until sufficient evidence is available. Observed records are shown below.")
      : text("Einkunnin lýsir SPF- og DMARC-stillingum þegar skoðunin fór fram. Hún staðfestir ekki afhendingu pósts, DKIM-undirritun eða samræmi sendanda.", "This grade describes SPF and DMARC configuration at the time of the check. It does not verify delivery, DKIM signatures or sender alignment."),
    sourceLabel: text("Kastro Lookup · DNS-skoðun", "Kastro Lookup · DNS check"), checkedLabel,
    durationLabel: typeof result.durationMs === "number" ? `${(result.durationMs / 1000).toLocaleString(is ? "is-IS" : "en-GB", {maximumFractionDigits: 1})} s` : text("Ekki skráð", "Not reported"),
    evidenceDetail: text("DNS-færslur geta breyst. Staðfestu niðurstöðurnar áður en þú breytir stillingum.", "DNS records can change. Verify these findings before changing configuration."),
    spf: {
      tone: spfTone as "pass" | "fail" | "warning",
      headline: incomplete ? text("SPF-skoðun er ólokið", "SPF assessment incomplete")
        : !result.spf.record ? text("Engin SPF-færsla fannst", "No SPF record found")
        : result.spf.lookups > 10 ? text("SPF fer yfir 10 uppflettinga hámarkið", "SPF exceeds the 10-lookup limit")
        : !result.spf.valid ? text("SPF-færslan þarfnast úrbóta", "SPF configuration needs attention")
        : text(`SPF notar ${result.spf.lookups} af 10 DNS-uppflettingum`, `SPF uses ${result.spf.lookups} of 10 DNS lookups`),
      detail: incomplete ? text("Ekki náðist að staðfesta alla SPF-keðjuna. Þetta getur stafað af villu eða takmörkun í uppflettingu og sannar ekki að SPF-færslan sé röng.", "The full SPF chain could not be verified. A resolver error or limitation is not proof that the record is invalid.")
        : a?.spfState === "yellow" ? text("Athugasemdir eru við SPF-stillingarnar. Farðu yfir viðurkennda sendendur og lokareglu færslunnar áður en þú breytir henni.", "The SPF configuration has warnings. Review authorized senders and the final policy before changing it.")
        : text("Uppflettingafjöldinn metur SPF-keðjuna. Hann staðfestir ekki að raunverulegar sendingar uppfylli SPF.", "The lookup count assesses the SPF chain. It does not verify SPF for actual messages."),
    },
    dmarc: {
      tone: dmarcTone as "pass" | "fail" | "warning",
      headline: !result.dmarc.record ? text("Engin DMARC-færsla fannst", "No DMARC record found")
        : !result.dmarc.valid ? text("DMARC-færslan inniheldur ekki gilda stefnu", "No valid DMARC policy found")
        : policy === "none" ? text("p=none — eftirlit án höfnunar", "p=none — monitoring without enforcement")
        : policy === "quarantine" ? text(`p=quarantine — sóttkví fyrir ${pct}% sendinga sem standast ekki mat`, `p=quarantine — quarantine requested for ${pct}% of failing messages`)
        : text(`p=reject — höfnun fyrir ${pct}% sendinga sem standast ekki mat`, `p=reject — rejection requested for ${pct}% of failing messages`),
      detail: a?.dmarcState === "yellow" ? text("Frekari athugasemdir eru við stefnuna, til dæmis hlutvernd eða skýrslugjöf. Farðu yfir alla færsluna hér að neðan.", "The policy has additional warnings, such as partial coverage or reporting. Review the full record below.") : undefined,
    },
    dkim: a?.dkimState === "green" ? text("DKIM-lykill fannst undir algengum selector.", "A DKIM key was found under a common selector.") : text("Enginn virkur DKIM-lykill var staðfestur undir þeim selectors sem voru skoðaðir. Póstþjónustan gæti notað annan selector.", "No active DKIM key was confirmed under the selectors checked. Your provider may use a different selector."),
    summary: incomplete ? text("Ljúktu skoðuninni áður en þú breytir DNS.", "Complete the evidence before changing DNS.") : text("Yfirfarðu niðurstöðurnar áður en þú breytir vörninni.", "Review the evidence before changing enforcement."),
    steps: [
      {title: text("Staðfestu færslurnar", "Verify the records"), detail: text("Berðu SPF- og DMARC-færslurnar saman við stillingar hjá DNS-hýsingaraðilanum. Einkunnin kemur ekki í stað heildarúttektar.", "Compare the SPF and DMARC records with your DNS provider. The grade is not a complete audit.")},
      {title: text("Skoðaðu raunverulegan póst", "Review real mail"), detail: text("Staðfestu lögmæta sendendur og SPF/DKIM-samræmi með pósthausum og DMARC-skýrslum.", "Confirm legitimate senders and SPF/DKIM alignment using message headers and DMARC reports.")},
      {title: text("Skipuleggðu breytingar", "Plan changes"), detail: text("Haltu núverandi vörn meðan á skoðun stendur. Ekki veikja DMARC eða breyta SPF eingöngu út frá þessari einkunn.", "Preserve current protection during investigation. Do not weaken DMARC or change SPF solely on the basis of this grade.")},
    ],
  };
}
