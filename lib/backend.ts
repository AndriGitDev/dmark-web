import { type AuditPayload, type ScanPayload } from "@/lib/scan";

type BackendAuditResponse = {
  grade?: string;
  risk?: string;
  safe?: boolean;
  proof_eligible?: boolean;
  message?: string;
  cta?: string;
  blocked_reason?: string;
};

type BackendScanResponse = {
  domain?: string;
  checked_at?: string;
  duration_ms?: number;
  summary?: {
    status?: string;
  };
  audit?: BackendAuditResponse;
  checks?: Array<{
    name?: string;
    status?: string;
    message?: string;
    record?: string;
    lookup_count?: number;
    lookups?: number;
  }>;
};

export type BackendAuditClaimResponse = {
  claim_id?: string;
  status?: string;
  audit?: BackendAuditResponse;
  error?: string;
};

export function shouldUseMockBackend(): boolean {
  return process.env.DMARK_USE_MOCK !== "false";
}

export function backendURL(endpoint: string | undefined, fallbackPath?: string): URL | null {
  const rawEndpoint = (endpoint || fallbackPath || "").trim();
  if (!rawEndpoint) return null;

  try {
    return new URL(rawEndpoint);
  } catch {
    const base = process.env.DMARK_API_BASE_URL?.trim();
    if (!base) return null;
    return new URL(rawEndpoint, base);
  }
}

export function auditClaimsURL(): URL | null {
  const configured = backendURL(process.env.DMARK_AUDIT_CLAIMS_API_URL);
  if (configured) return configured;

  const scanURL = backendURL(process.env.DMARK_SCAN_API_URL);
  if (!scanURL) return null;

  const segments = scanURL.pathname.split("/");
  if (segments[segments.length - 1] === "scan") {
    segments[segments.length - 1] = "audit-claims";
    scanURL.pathname = segments.join("/");
    scanURL.search = "";
    return scanURL;
  }

  return null;
}

export function mapScanResponse(payload: BackendScanResponse, fallbackDomain: string): ScanPayload {
  const checks = payload.checks || [];
  const spf = checks.find((check) => check.name?.toLowerCase() === "spf");
  const dmarc = checks.find((check) => check.name?.toLowerCase() === "dmarc");
  const policy = dmarc?.record?.match(/(?:^|;\s*)p=([^;\s]+)/i)?.[1]?.toLowerCase() || "none";
  const spfLookups = spf?.lookup_count || spf?.lookups || countSPFLookups(spf?.record || "");
  const audit = mapAuditResponse(payload.audit);
  const status = audit?.safe ? "PASS" : statusFromBackend(payload.summary?.status);

  return {
    domain: payload.domain || fallbackDomain,
    status,
    checkedAt: payload.checked_at,
    durationMs: payload.duration_ms,
    audit,
    spf: {
      valid: statusFromBackend(spf?.status) !== "FAIL",
      lookups: spfLookups,
      record: spf?.record || spf?.message || "No SPF record returned.",
    },
    dmarc: {
      valid: policy !== "none" && statusFromBackend(dmarc?.status) !== "FAIL",
      policy,
      record: dmarc?.record || dmarc?.message || "No DMARC record returned.",
    },
    spoofable: audit ? !audit.safe : policy === "none" || status === "FAIL",
  };
}

export function mapAuditResponse(payload: BackendAuditResponse | undefined): AuditPayload | undefined {
  if (!payload) return undefined;

  return {
    grade: payload.grade || "Unknown",
    risk: payload.risk || "medium",
    safe: Boolean(payload.safe),
    proofEligible: Boolean(payload.proof_eligible),
    message: payload.message || "Audit completed.",
    cta: payload.cta || "Review the findings.",
    blockedReason: payload.blocked_reason,
  };
}

export async function backendErrorMessage(response: Response, fallback: string): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  return payload.error || fallback;
}

function statusFromBackend(status?: string): ScanPayload["status"] {
  const normalized = (status || "").toLowerCase();
  if (normalized === "pass") return "PASS";
  if (normalized === "warn" || normalized === "warning") return "WARNING";
  return "FAIL";
}

function countSPFLookups(record: string): number {
  if (!record) return 0;

  return record
    .split(/\s+/)
    .filter((term) => {
      const normalized = term.trim().toLowerCase();
      return (
        normalized.startsWith("include:") ||
        normalized === "a" ||
        normalized.startsWith("a:") ||
        normalized.startsWith("a/") ||
        normalized === "mx" ||
        normalized.startsWith("mx:") ||
        normalized.startsWith("mx/") ||
        normalized === "ptr" ||
        normalized.startsWith("ptr:") ||
        normalized.startsWith("exists:") ||
        normalized.startsWith("redirect=")
      );
    }).length;
}
