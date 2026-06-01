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
  audit?: AuditPayload;
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

export type UpgradePayload = {
  name: string;
  domain: string;
  email: string;
  plan: "saas" | "managed";
};

export type UpgradeResponse = {
  ok: boolean;
  claimId?: string;
  claimStatus?: string;
  audit?: AuditPayload;
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

export function normalizeDomain(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();
}

export function buildScanRemediationPlan(result: ScanPayload): ScanRemediationPlan {
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
      cta: "Claim this audit and move toward p=reject.",
    },
  };
}
