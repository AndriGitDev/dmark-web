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

export function normalizeDomain(input: string) {
  return input
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .split("/")[0]
    .toLowerCase();
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
