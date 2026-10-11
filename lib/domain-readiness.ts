import type { ScanPayload } from "./scan";

export type ReadinessCheck = {
  id: string;
  passed: boolean;
  title: string;
  action: string;
  verify: string;
  name: string;
};
export function domainReadiness(result: ScanPayload, locale = "en") {
  const text = (en: string, is: string) => (locale === "en" ? en : is);
  const complete =
    result.source === "live" &&
    !!result.assessment &&
    !result.assessment.incomplete;
  const dkim = result.authentication?.dkim;
  const checks: ReadinessCheck[] = [
    {
      id: "spf-valid",
      passed: result.spf.valid && result.spf.lookups <= 10,
      title: text("Publish valid SPF", "Birta gilda SPF færslu"),
      name: result.domain,
      action: text(
        "List every service that sends mail for this domain. Use each provider’s exact SPF instructions to repair the single SPF TXT record. Keep authorised senders; do not add a second SPF record.",
        "Skráðu allar þjónustur sem senda póst fyrir lénið. Notaðu nákvæmar SPF leiðbeiningar hvers veitanda til að laga eina SPF TXT færslu. Haltu heimiluðum sendendum og ekki bæta við annarri SPF færslu.",
      ),
      verify: text(
        "Recheck: SPF must validate with no more than 10 DNS lookups.",
        "Athugaðu aftur: SPF þarf að vera gilt með að hámarki 10 DNS uppflettingum.",
      ),
    },
    {
      id: "spf-health",
      passed:
        result.spf.valid &&
        result.spf.lookups < 8 &&
        result.assessment?.spfState === "green",
      title: text("Resolve SPF warnings", "Leysa SPF viðvaranir"),
      name: result.domain,
      action: text(
        `Current lookup count: ${result.spf.lookups}/10. Review the observed SPF warning and remove only confirmed obsolete includes. Aim for fewer than 8 lookups and a green SPF assessment. Dmark does not host or flatten SPF.`,
        `Núverandi uppflettingar: ${result.spf.lookups}/10. Farðu yfir SPF viðvörunina og fjarlægðu aðeins staðfestar úreltar tilvísanir. Stefndu á færri en 8 uppflettingar og græna SPF niðurstöðu. Dmark hýsir ekki eða fletur út SPF.`,
      ),
      verify: text(
        "Recheck: valid SPF, fewer than 8 lookups, no assessed SPF warnings.",
        "Athugaðu aftur: gilt SPF, færri en 8 uppflettingar og engar SPF viðvaranir í matinu.",
      ),
    },
    {
      id: "dkim",
      passed: dkim
        ? dkim.state === "published"
        : result.assessment?.dkimState === "green",
      title: text(
        "Confirm a published DKIM key",
        "Staðfesta birta DKIM lykilfærslu",
      ),
      name: dkim?.name || `selector._domainkey.${result.domain}`,
      action: text(
        "Enable DKIM in every sending provider. Copy the provider’s exact DNS name and TXT or CNAME value into your DNS host. Enter its selector in the selector field and recheck. Common-selector discovery is limited; an undiscovered key does not prove DKIM is absent.",
        "Virkjaðu DKIM hjá öllum póstveitendum. Afritaðu nákvæmt DNS heiti og TXT eða CNAME gildi frá veitandanum til DNS hýsingarinnar. Settu selector í selector reitinn og athugaðu aftur. Leit að algengum selectors er takmörkuð; lykill sem finnst ekki sannar ekki að DKIM vanti.",
      ),
      verify: text(
        "Recheck: a key is published. Then send real mail from each provider and inspect DKIM=pass and alignment; DNS alone cannot verify signatures.",
        "Athugaðu aftur: lykilfærsla er birt. Sendu síðan raunverulegan póst frá hverjum veitanda og staðfestu DKIM=pass og samsvörun léna; DNS eitt staðfestir ekki undirritun.",
      ),
    },
    {
      id: "dmarc-valid",
      passed: result.dmarc.valid,
      title: text("Publish valid DMARC", "Birta gilda DMARC færslu"),
      name: `_dmarc.${result.domain}`,
      action: text(
        "Publish or repair one DMARC TXT record at this name. Choose a reporting destination you control and review aggregate reports. Preserve an existing enforcing policy while fixing syntax; use your provider’s instructions for exact values.",
        "Birtu eða lagaðu eina DMARC TXT færslu á þessu heiti. Veldu skýrslumóttakanda sem þú stjórnar og farðu yfir samantektarskýrslur. Haltu núverandi framfylgd á meðan þú lagar setningafræði; notaðu leiðbeiningar veitandans um nákvæm gildi.",
      ),
      verify: text(
        "Recheck: DMARC validates. Report delivery and sender alignment need a separate real-mail review.",
        "Athugaðu aftur: DMARC er gilt. Móttöku skýrslna og samsvörun sendenda þarf að yfirfara sérstaklega með raunverulegum pósti.",
      ),
    },
    {
      id: "dmarc-reject",
      passed:
        result.dmarc.valid &&
        result.dmarc.policy === "reject" &&
        result.assessment?.pct === 100 &&
        result.assessment?.dmarcState === "green",
      title: text("Reach full DMARC enforcement", "Ná fullri DMARC framfylgd"),
      name: `_dmarc.${result.domain}`,
      action: text(
        "Before increasing enforcement, confirm all legitimate senders pass aligned SPF or DKIM using real messages and DMARC reports. Move a monitoring policy through a reviewed quarantine rollout to p=reject at pct=100. Keep an existing reject policy; resolve any reported warnings. Recheck after DNS propagation.",
        "Áður en þú herðir framfylgd skaltu staðfesta með raunverulegum pósti og DMARC skýrslum að allir réttmætir sendendur standist SPF eða DKIM með samsvarandi léni. Færðu vöktunarstefnu í yfirfarna quarantine innleiðingu og síðan p=reject við pct=100. Haltu núverandi reject stefnu og leystu viðvaranir. Athugaðu aftur eftir DNS útbreiðslu.",
      ),
      verify: text(
        "Recheck: valid DMARC, p=reject, pct=100 and a green DMARC assessment.",
        "Athugaðu aftur: gilt DMARC, p=reject, pct=100 og grænt DMARC mat.",
      ),
    },
  ];
  const passed = checks.filter((c) => c.passed).length;
  return {
    checks,
    score: complete ? passed * 20 : null,
    passed,
    next: checks.find((c) => !c.passed),
    complete,
  };
}

export type ScoreSnapshot = {
  score: number | null;
  grade: string;
  checkedAt: string;
  selector: string;
};
export const scoreCacheKey = "dmark:scores:v1";
export function parseScoreCache(
  raw: string | null,
  now = Date.now(),
): Record<string, ScoreSnapshot> {
  try {
    if (!raw || raw.length > 20000) return {};
    const parsed = JSON.parse(raw);
    if (parsed.v !== 1 || !Array.isArray(parsed.scores)) return {};
    const out: Record<string, ScoreSnapshot> = {};
    for (const [domain, entry] of parsed.scores.slice(0, 20)) {
      if (
        typeof domain !== "string" ||
        !/^[a-z0-9.-]+$/.test(domain) ||
        !entry ||
        typeof entry.checkedAt !== "string" ||
        typeof entry.selector !== "string" ||
        ![null, 0, 20, 40, 60, 80, 100].includes(entry.score) ||
        !["A", "B", "C", "F", "—"].includes(entry.grade)
      )
        continue;
      const time = Date.parse(entry.checkedAt);
      if (
        !Number.isFinite(time) ||
        time > now + 60000 ||
        now - time > 7 * 86400000
      )
        continue;
      out[domain] = {
        score: entry.score,
        grade: entry.grade,
        checkedAt: entry.checkedAt,
        selector: entry.selector,
      };
    }
    return out;
  } catch {
    return {};
  }
}
