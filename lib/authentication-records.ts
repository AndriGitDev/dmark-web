export type RecordObservation = {
  name: string;
  state: "published" | "missing" | "invalid" | "error";
  record: string;
};
export type AuthenticationRecords = { bimi: RecordObservation; dkim?: RecordObservation };
type TXTLookup = (name: string) => Promise<string[][]>;

export function validSelector(selector: string): boolean {
  return selector.length > 0 && selector.length <= 128 && selector.split(".").every(label =>
    label.length > 0 && label.length <= 63 && /^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/i.test(label));
}

async function observe(name: string, kind: "bimi" | "dkim", lookup: TXTLookup): Promise<RecordObservation> {
  try {
    const rows = await lookup(name);
    const records = rows.map(parts => parts.join("")).filter(value => kind === "bimi"
      ? /^v=BIMI1(?:\s*;|$)/i.test(value) : /(?:^|;)\s*p\s*=/i.test(value));
    if (!records.length) return { name, state: "missing", record: "" };
    if (records.length !== 1 || records[0].length > 8192) return { name, state: "invalid", record: "" };
    const record = records[0];
    const tags = new Map<string, string>();
    for (const part of record.split(";")) {
      if (!part.trim()) continue;
      const index = part.indexOf("=");
      if (index < 1) return { name, state: "invalid", record };
      const key = part.slice(0, index).trim().toLowerCase();
      if (tags.has(key)) return { name, state: "invalid", record };
      tags.set(key, part.slice(index + 1).trim());
    }
    // This checks publication only. No remote SVG/certificate downloads or key validation.
    const valid = kind === "bimi" ? tags.get("v") === "BIMI1" && !!tags.get("l")?.startsWith("https://")
      : !!tags.get("p") && (!tags.has("v") || tags.get("v") === "DKIM1");
    return { name, state: valid ? "published" : "invalid", record };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? error.code : "";
    return { name, state: code === "ENODATA" || code === "ENOTFOUND" ? "missing" : "error", record: "" };
  }
}

export async function lookupAuthenticationRecords(domain: string, selector: string, lookup: TXTLookup): Promise<AuthenticationRecords> {
  const [bimi, dkim] = await Promise.all([
    observe(`default._bimi.${domain}`, "bimi", lookup),
    selector ? observe(`${selector}._domainkey.${domain}`, "dkim", lookup) : undefined,
  ]);
  return { bimi, ...(dkim ? { dkim } : {}) };
}
