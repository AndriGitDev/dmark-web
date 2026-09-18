export type ScanStatus = "PASS" | "WARNING" | "FAIL";

export type AuditPayload = {
  grade: string;
  risk: "low" | "medium" | "high" | "critical" | string;
  safe: boolean;
  proofEligible: boolean;
  message: string;
  cta: string;
  blockedReason?: string;
};

export type ScanPayload = {
  domain: string;
  status: ScanStatus;
  checkedAt?: string;
  durationMs?: number;
  source?: "live" | "demo";
  audit?: AuditPayload;
  assessment?: {
    incomplete: boolean;
    pct: number;
    spfReason: string;
    dmarcReason: string;
    dkimState: "red" | "yellow" | "green";
    dkimReason: string;
    warnings: string[];
  };
  spf: {
    valid: boolean;
    lookups: number;
    record: string;
  };
  dmarc: {
    valid: boolean;
    policy: "none" | "quarantine" | "reject" | string;
    record: string;
  };
  spoofable: boolean;
};

export type ScanRemediationStep = {
  title: string;
  detail: string;
  tone: "critical" | "warning" | "stable";
};

export type ScanRemediationPlan = {
  summary: string;
  steps: ScanRemediationStep[];
};

export type ScanEvidenceSummary = {
  sourceLabel: string;
  checkedLabel: string;
  durationLabel: string;
  detail: string;
};

export type FindingTone = "fail" | "warning" | "pass";

export type DmarcFinding = {
  tone: FindingTone;
  statusLabel: "FAIL" | "PARTIAL" | "PASS";
  headline: string;
};

export type SpfFinding = {
  tone: FindingTone;
  statusLabel: "FAIL" | "PRESSURE" | "PASS";
  headline: string;
  detail: string;
};

export function buildSpfFinding(result: ScanPayload): SpfFinding {
  const lookups = result.spf.lookups;
  if (result.assessment) {
    const tone = result.assessment.incomplete ? "warning" : !result.spf.valid ? "fail" : /~all/i.test(result.spf.record) || lookups >= 8 ? "warning" : "pass";
    return {tone, statusLabel: tone === "pass" ? "PASS" : tone === "fail" ? "FAIL" : "PRESSURE",
      headline: result.assessment.incomplete ? "SPF assessment incomplete" : result.assessment.spfReason,
      detail: result.assessment.incomplete ? result.assessment.warnings.join(" ") || "The lookup service could not resolve the full SPF chain." : `Observed lookup count: ${lookups}/10. This does not verify sender alignment.`};
  }

  if (!result.spf.valid) {
    return {
      tone: "fail",
      statusLabel: "FAIL",
      headline: "FAIL - SPF record did not validate.",
      detail:
        lookups > 10
          ? `It also uses ${lookups} DNS lookups, beyond the 10-lookup receiver limit. Fix syntax and flatten includes before tightening DMARC.`
          : `It reports ${lookups} DNS lookups. Fix syntax or authorised sender entries before tightening DMARC.`,
    };
  }

  if (lookups > 10) {
    return {
      tone: "fail",
      statusLabel: "FAIL",
      headline: `FAIL - SPF uses ${lookups} DNS lookups, above the receiver limit.`,
      detail: "Receivers can stop evaluation after 10 DNS lookups and return a permerror. Flatten SPF before enforcement changes.",
    };
  }

  if (lookups >= 8) {
    return {
      tone: "warning",
      statusLabel: "PRESSURE",
      headline: `PRESSURE - SPF uses ${lookups}/10 DNS lookups.`,
      detail: "The record still passes, but one more sender include could push it over the limit. Plan flattening before adding vendors.",
    };
  }

  return {
    tone: "pass",
    statusLabel: "PASS",
    headline: `PASS - SPF uses ${lookups}/10 DNS lookups.`,
    detail: "The SPF lookup budget has room for normal provider drift. Keep reviewing it when senders change.",
  };
}

export function buildDmarcFinding(result: ScanPayload): DmarcFinding {
  if (result.assessment) {
    const tone = !result.dmarc.valid || result.dmarc.policy === "none" ? "fail" : result.dmarc.policy === "reject" && result.assessment.pct === 100 ? "pass" : "warning";
    return {tone, statusLabel: tone === "pass" ? "PASS" : tone === "fail" ? "FAIL" : "PARTIAL", headline: result.assessment.dmarcReason};
  }
  if (!result.dmarc.valid || result.dmarc.policy === "none") {
    return {
      tone: "fail",
      statusLabel: "FAIL",
      headline: "FAIL - Policy set to p=none. Domain is actively vulnerable to spoofing.",
    };
  }

  if (result.dmarc.policy === "quarantine") {
    return {
      tone: "warning",
      statusLabel: "PARTIAL",
      headline: "PARTIAL - Policy set to p=quarantine. Suspicious mail is quarantined, but reject is not yet active.",
    };
  }

  return {
    tone: "pass",
    statusLabel: "PASS",
    headline: `PASS - Policy set to p=${result.dmarc.policy}.`,
  };
}

export function buildScanEvidenceSummary(result: ScanPayload): ScanEvidenceSummary {
  const demo = result.source === "demo";

  return {
    sourceLabel: demo ? "Illustrative browser demo" : "Kastro Lookup · live DNS",
    checkedLabel: formatCheckedAt(result.checkedAt),
    durationLabel: typeof result.durationMs === "number" ? `${result.durationMs}ms` : "Not reported",
    detail: demo
      ? "This result is generated locally for education. It is not based on a live DNS lookup."
      : "Treat this as a point-in-time DNS observation and verify it before making changes.",
  };
}

function formatCheckedAt(value: string | undefined): string {
  if (!value) return "Not reported";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(timestamp));
}

export function normalizeDomain(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();
}

export function validateScannableDomain(input: string): { domain: string; error?: string } {
  const domain = normalizeDomain(input);

  if (!domain) {
    return { domain: "", error: "Enter a domain before scanning." };
  }

  if (domain.includes("@")) {
    return { domain, error: "Enter the domain only, not an email address." };
  }

  if (/\s/.test(domain)) {
    return { domain, error: "Domain names cannot contain spaces." };
  }

  if (domain.length > 253) {
    return { domain, error: "Domain name is too long to scan safely." };
  }

  if (domain.endsWith(".") || domain.startsWith(".")) {
    return { domain, error: "Enter a domain without leading or trailing dots." };
  }

  const labels = domain.split(".");
  if (labels.length < 2) {
    return { domain, error: "Enter a full domain such as yourcompany.is." };
  }

  const invalidLabel = labels.find(
    (label) =>
      label.length === 0 ||
      label.length > 63 ||
      label.startsWith("-") ||
      label.endsWith("-") ||
      !/^[a-z0-9-]+$/i.test(label),
  );

  if (invalidLabel !== undefined) {
    return { domain, error: "Enter a valid domain name using letters, numbers, dots, and hyphens." };
  }

  const topLevelDomain = labels[labels.length - 1];
  if (!/[a-z]/i.test(topLevelDomain) && !topLevelDomain.startsWith("xn--")) {
    return { domain, error: "Enter a public domain with a valid top-level domain." };
  }

  return { domain };
}

export function buildScanRemediationPlan(result: ScanPayload): ScanRemediationPlan {
  if (result.assessment) {
    return {
      summary: result.assessment.incomplete ? "Complete the missing evidence before making DNS changes." : "Review the evidence before changing enforcement.",
      steps: [
        {title: "Verify the records", detail: "Check the displayed SPF and DMARC records with your DNS provider. A lookup rating is not a complete mail authentication audit.", tone: "warning"},
        {title: "Review real mail", detail: "Confirm legitimate senders and SPF/DKIM alignment using message headers and DMARC reports. A published DKIM key does not prove that messages are signed correctly.", tone: "warning"},
        {title: "Plan changes safely", detail: "Preserve existing protection while investigating. Do not weaken DMARC or flatten SPF solely on the basis of this automated result.", tone: "stable"},
      ],
    };
  }
  const spfOverLimit = result.spf.lookups > 10;
  const spfNeedsWork = !result.spf.valid || spfOverLimit;
  const dmarcNotEnforcing = !result.dmarc.valid || result.dmarc.policy === "none";
  const dmarcPartial = result.dmarc.policy === "quarantine";

  if (!spfNeedsWork && !dmarcNotEnforcing && result.dmarc.policy === "reject") {
    return {
      summary: "Domain is enforcing; keep watching for sender and DNS drift.",
      steps: [
        {
          title: "Keep SPF below the limit",
          detail: `Current SPF uses ${result.spf.lookups} DNS lookups, safely below the 10-lookup receiver limit.`,
          tone: "stable",
        },
        {
          title: "Keep DMARC at p=reject",
          detail: "Reject policy is active. Review reports before adding or removing authorised senders.",
          tone: "stable",
        },
        {
          title: "Watch new senders",
          detail: "New marketing, billing, or support tools should be added deliberately so alignment does not drift.",
          tone: "stable",
        },
      ],
    };
  }

  if (spfNeedsWork) {
    return {
      summary: spfOverLimit
        ? "Fix SPF lookup pressure before moving DMARC to enforcement."
        : "Repair SPF before tightening DMARC enforcement.",
      steps: [
        {
          title: spfOverLimit ? "Flatten SPF includes" : "Repair SPF record",
          detail: spfOverLimit
            ? `The SPF record uses ${result.spf.lookups} DNS lookups; receivers can stop evaluating after 10 and return a permerror.`
            : "The SPF record did not validate. Fix syntax and authorised senders before policy changes.",
          tone: "critical",
        },
        {
          title: "Keep monitoring DMARC reports",
          detail: "Stay at p=none while SPF is unstable so legitimate mail failures are visible before enforcement.",
          tone: "warning",
        },
        {
          title: "Move toward p=reject",
          detail: "After SPF is stable, progress through quarantine and reject with report evidence rather than a blind DNS edit.",
          tone: "warning",
        },
      ],
    };
  }

  if (dmarcNotEnforcing || dmarcPartial) {
    return {
      summary: dmarcPartial ? "SPF is stable; finish the path from quarantine to reject." : "SPF is stable; start DMARC enforcement carefully.",
      steps: [
        {
          title: "Review aligned senders",
          detail: "Confirm Google, Microsoft, marketing, and local mail streams are aligned before changing policy.",
          tone: "warning",
        },
        {
          title: dmarcPartial ? "Advance from quarantine" : "Move from p=none",
          detail: dmarcPartial
            ? "Use report evidence to raise confidence before switching to p=reject."
            : "Start with quarantine for controlled enforcement, then progress to reject once failures are understood.",
          tone: "warning",
        },
        {
          title: "Keep SPF below the limit",
          detail: `Current SPF uses ${result.spf.lookups} DNS lookups; keep it below 10 as vendors change their includes.`,
          tone: "stable",
        },
      ],
    };
  }

  return {
    summary: "Scan passed, but keep DNS and sender inventory under review.",
    steps: [
      {
        title: "Track DNS drift",
        detail: "DNS records can regress when a new vendor, CRM, or helpdesk starts sending mail.",
        tone: "stable",
      },
      {
        title: "Review reports monthly",
        detail: "Aggregate DMARC reports show which sources are still sending as the domain.",
        tone: "stable",
      },
      {
        title: "Document change owners",
        detail: "Keep a clear owner for DNS changes so email authentication stays deliberate.",
        tone: "stable",
      },
    ],
  };
}

export function mockScan(domain: string): ScanPayload {
  const normalized = normalizeDomain(domain) || "example.is";
  const safer =
    normalized.includes("reject") ||
    normalized.includes("safe") ||
    normalized.includes("kastro");

  if (safer) {
    return {
      domain: normalized,
      status: "PASS",
      checkedAt: new Date().toISOString(),
      durationMs: 900,
      source: "demo",
      spf: {
        valid: true,
        lookups: 5,
        record: "v=spf1 include:_spf.google.com include:spf.protection.outlook.com -all",
      },
      dmarc: {
        valid: true,
        policy: "reject",
        record: `v=DMARC1; p=reject; rua=mailto:dmarc@${normalized}`,
      },
      spoofable: false,
      audit: {
        grade: "A",
        risk: "low",
        safe: true,
        proofEligible: false,
        message: "DMARC is enforcing for this domain.",
        cta: "Keep monitoring for sender and DNS drift.",
      },
    };
  }

  return {
    domain: normalized,
    status: "FAIL",
    checkedAt: new Date().toISOString(),
    durationMs: 900,
    source: "demo",
    spf: {
      valid: false,
      lookups: 14,
      record: "v=spf1 include:_spf.google.com include:sendgrid.net include:mailgun.org -all",
    },
    dmarc: {
      valid: false,
      policy: "none",
      record: `v=DMARC1; p=none; rua=mailto:dmarc@${normalized}`,
    },
    spoofable: true,
    audit: {
      grade: "F",
      risk: "critical",
      safe: false,
      proofEligible: true,
      message: "DMARC is not enforcing, so spoofed mail can still reach recipients.",
      cta: "Discuss a real DNS review and a safe path toward p=reject.",
    },
  };
}

