import type { MailRouting, ScanPayload } from "./scan";

type ObjectValue = Record<string, unknown>;
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid lookup response");
  return value as ObjectValue;
}
function record(value: unknown): string {
  if (value === null) return "";
  if (typeof value !== "string" || value.length > 16384) throw new Error("Invalid DNS record");
  return value;
}
function strings(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100 || !value.every(v => typeof v === "string" && v.length <= 16384)) throw new Error("Invalid lookup evidence");
  return value;
}
function state(value: unknown): "red" | "yellow" | "green" {
  if (value !== "red" && value !== "yellow" && value !== "green") throw new Error("Invalid assessment state");
  return value;
}

const hostname = /^(?=.{1,253}$)[a-z0-9_](?:[a-z0-9_-]{0,62})(?:\.[a-z0-9_](?:[a-z0-9_-]{0,62}))*$/;
function host(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase().replace(/\.$/, "");
  return hostname.test(name) ? name : null;
}

/** MX and NS hosts let the app name the mail provider and DNS host. */
export function mapMailRouting(value: unknown): MailRouting {
  const empty = { mx: [], ns: [], mxKnown: false, nsKnown: false };
  if (!value || typeof value !== "object" || Array.isArray(value)) return empty;
  const dns = value as ObjectValue;
  const errors = dns.recordErrors && typeof dns.recordErrors === "object" ? dns.recordErrors as ObjectValue : {};
  const mxRecords = Array.isArray(dns.mx) ? dns.mx.slice(0, 20) : null;
  const mx = (mxRecords ?? [])
    .filter((entry): entry is ObjectValue => !!entry && typeof entry === "object")
    .map((entry) => ({ name: host(entry.exchange), priority: Number.isFinite(entry.priority) ? entry.priority as number : 0 }))
    .filter((entry): entry is { name: string; priority: number } => !!entry.name)
    .sort((a, b) => a.priority - b.priority)
    .map((entry) => entry.name);
  const ns = (Array.isArray(dns.ns) ? dns.ns.slice(0, 20) : []).map(host).filter((name): name is string => !!name);
  return {
    mx: Array.from(new Set(mx)),
    ns: Array.from(new Set(ns)).sort(),
    mxKnown: !!mxRecords && !errors.MX,
    nsKnown: Array.isArray(dns.ns) && !errors.NS,
  };
}

/** Adapt observed upstream evidence; never substitute fabricated results. */
export function mapLookupResponse(value: unknown, domain: string, durationMs: number): ScanPayload {
  const data = object(value);
  if (data.type !== "domain" || data.query !== domain) throw new Error("Mismatched lookup response");
  const errors = data.errors ? object(data.errors) : {};
  if (errors.dns || errors.emailSecurity) throw new Error("Incomplete DNS response");
  const email = object(data.emailSecurity);
  const spf = object(email.spf);
  const dmarc = object(email.dmarc);
  const dkim = object(email.dkim);
  const spfRecord = record(spf.record);
  const dmarcRecord = record(dmarc.record);
  const spfState = state(spf.state);
  const dmarcState = state(dmarc.state);
  const dkimState = state(dkim.state);
  if (!Number.isInteger(spf.lookupCount) || (spf.lookupCount as number) < 0 || (spf.lookupCount as number) > 100) throw new Error("Invalid lookup count");
  const lookups = spf.lookupCount as number;
  const permErrors = strings(spf.permErrors);
  const warnings = strings(spf.warnings);
  if (!Array.isArray(spf.chain) || spf.chain.length > 100) throw new Error("Invalid SPF chain");
  const definitiveErrors = new Set(["no SPF record", "multiple SPF records"]);
  const chainIncomplete = spf.chain.some(entry => {
    const error = object(entry).error;
    return !!error && !definitiveErrors.has(String(error));
  });
  // Resolver failures, blocked include targets and loops are not proof that a domain fails SPF.
  const incomplete = chainIncomplete || warnings.length > 0 || permErrors.some(e => !/^(PermError: SPF record requires|SPF include\/redirect loop:|Missing SPF include\/redirect record:|Multiple SPF records at)/.test(e));
  const tags = dmarc.tags === null ? {} : object(dmarc.tags);
  const policy = tags.p === "reject" || tags.p === "quarantine" || tags.p === "none" ? tags.p : "unknown";
  const pct = tags.pct === undefined ? 100 : tags.pct;
  if (!Number.isInteger(pct) || (pct as number) < 0 || (pct as number) > 100) throw new Error("Invalid DMARC percentage");
  const validDmarc = !!dmarcRecord && policy !== "unknown";
  const validSpf = !!spfRecord && lookups <= 10 && permErrors.length === 0 && !incomplete && spfState !== "red";
  const enforcing = validDmarc && policy === "reject" && pct === 100;
  const fail = !validDmarc || policy === "none" || spfState === "red" || lookups > 10 || permErrors.length > 0;
  const pass = validSpf && enforcing && spfState === "green" && dmarcState === "green";
  const status = incomplete ? "WARNING" : fail ? "FAIL" : pass ? "PASS" : "WARNING";
  const grade = incomplete ? "—" : fail ? "F" : pass ? "A" : enforcing ? "B" : "C";
  return {
    domain, source: "live", checkedAt: new Date().toISOString(), durationMs, status,
    spf: {valid: validSpf, lookups, record: spfRecord},
    dmarc: {valid: validDmarc, policy, record: dmarcRecord},
    spoofable: !enforcing,
    mail: mapMailRouting(data.dns),
    assessment: {
      incomplete, spfState, dmarcState, pct: pct as number,
      spfReason: record(spf.reason), dmarcReason: record(dmarc.reason),
      dkimState, dkimReason: record(dkim.reason),
      warnings: [...permErrors, ...warnings],
    },
    audit: {
      grade, risk: incomplete ? "unknown" : fail ? "high" : pass ? "low" : "medium",
      safe: false, proofEligible: false,
      message: incomplete
        ? "The lookup service could not complete the SPF chain. No overall grade is assigned; the observed records are shown below."
        : "Point-in-time SPF/DMARC configuration rating. This is not a test of message delivery, DKIM signatures, or sender alignment.",
      cta: "Review legitimate senders and DMARC reports before changing DNS.",
    },
  };
}
