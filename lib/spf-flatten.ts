import { isIP } from "node:net";

export class FlattenError extends Error {
  constructor(
    public code: string,
    public target = "",
    public term = "",
  ) {
    super(code);
  }
}
export type FlattenSource = {
  network: string;
  domain: string;
  mechanism: string;
};
export type FlattenResult = {
  domain: string;
  original: string;
  flattened: string;
  generatedAt: string;
  dependencies: number;
  lookupTerms: number;
  sources: FlattenSource[];
  zoneValue: string;
};
type Policy = {
  record: string;
  networks: FlattenSource[];
  terminal: string;
  lookupTerms: number;
};

// Intentionally restricted to positive IP/include mechanisms and redirects.
// Negative/neutral mechanisms, macros, a/mx/ptr/exists and modifiers are refused,
// rather than expanding them into a set that can change sender authorisation.
export async function flattenSpf(
  input: string,
  lookup: (domain: string) => Promise<string[][]>,
): Promise<FlattenResult> {
  const cache = new Map<string, Policy>();
  let queries = 0;
  const started = Date.now();
  function target(value: string) {
    const name = value.toLowerCase().replace(/\.$/, "");
    if (
      name.length > 253 ||
      !name.includes(".") ||
      !name
        .split(".")
        .every(
          (label) =>
            label.length > 0 &&
            label.length <= 63 &&
            /^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/i.test(label),
        ) ||
      isIP(name) ||
      /(?:^|\.)(?:localhost|local|internal|home|lan|arpa)$/.test(name)
    )
      throw new FlattenError("UNSUPPORTED_TARGET", value);
    return name;
  }
  function ipNetwork(term: string) {
    const match = /^(ip[46]):([^/]+)(?:\/(\d+))?$/i.exec(term);
    if (!match) throw new FlattenError("INVALID_RECORD", "", term);
    const family = match[1].toLowerCase() === "ip4" ? 4 : 6;
    if (
      isIP(match[2]) !== family ||
      (match[3] !== undefined &&
        (!/^\d{1,3}$/.test(match[3]) ||
          Number(match[3]) > (family === 4 ? 32 : 128)))
    )
      throw new FlattenError("INVALID_RECORD", "", term);
    // Preserve networks exactly; never widen or coalesce ranges.
    return `${match[1].toLowerCase()}:${match[2].toLowerCase()}${match[3] === undefined ? "" : "/" + Number(match[3])}`;
  }
  async function walk(name: string, path: string[]): Promise<Policy> {
    if (path.includes(name)) throw new FlattenError("LOOP", name);
    if (path.length >= 12 || Date.now() - started > 12000)
      throw new FlattenError("LIMIT", name);
    const prior = cache.get(name);
    if (prior) return prior;
    if (++queries > 40) throw new FlattenError("LIMIT", name);
    let rows: string[][];
    try {
      rows = await lookup(name);
    } catch {
      throw new FlattenError("DNS_FAILED", name);
    }
    if (rows.length > 100 || rows.some((row) => row.join("").length > 8192))
      throw new FlattenError("LIMIT", name);
    const records = rows
      .map((row) => row.join(""))
      .filter((row) => /^v=spf1(?:\s|$)/i.test(row));
    if (records.length !== 1)
      throw new FlattenError(
        records.length ? "MULTIPLE_RECORDS" : "MISSING_RECORD",
        name,
      );
    const record = records[0];
    if (!/^[\x20-\x7e]+$/.test(record))
      throw new FlattenError("INVALID_RECORD", name);
    const terms = record.trim().split(/ +/).slice(1);
    if (terms.length > 100) throw new FlattenError("LIMIT", name);
    let terminal = "";
    let redirect = "";
    let lookupTerms = 0;
    const networks: FlattenSource[] = [];
    for (let index = 0; index < terms.length; index++) {
      const term = terms[index];
      if (/^[-~?]all$/i.test(term)) {
        // Strict final-position requirement avoids ambiguous/unreachable terms.
        if (index !== terms.length - 1 || redirect)
          throw new FlattenError("UNSUPPORTED_TERM", name, term);
        terminal = term.toLowerCase();
        continue;
      }
      if (/^redirect=/i.test(term)) {
        if (redirect || index !== terms.length - 1)
          throw new FlattenError("UNSUPPORTED_TERM", name, term);
        redirect = target(term.slice(9));
        continue;
      }
      const positive = term.startsWith("+") ? term.slice(1) : term;
      if (/^ip[46]:/i.test(positive))
        networks.push({
          network: ipNetwork(positive),
          domain: name,
          mechanism: term,
        });
      else if (/^include:/i.test(positive)) {
        const child = await walk(target(positive.slice(8)), [...path, name]);
        networks.push(...child.networks);
        lookupTerms += 1 + child.lookupTerms;
      } else throw new FlattenError("UNSUPPORTED_TERM", name, term);
      if (networks.length > 200 || lookupTerms > 100)
        throw new FlattenError("LIMIT", name);
    }
    if (redirect) {
      const child = await walk(redirect, [...path, name]);
      networks.push(...child.networks);
      terminal = child.terminal;
      lookupTerms += 1 + child.lookupTerms;
    }
    if (!terminal)
      throw new FlattenError(
        "UNSUPPORTED_TERM",
        name,
        "missing explicit -all, ~all or ?all",
      );
    if (networks.length > 200 || lookupTerms > 100)
      throw new FlattenError("LIMIT", name);
    const policy = { record, networks, terminal, lookupTerms };
    cache.set(name, policy);
    return policy;
  }
  const domain = target(input);
  const policy = await walk(domain, []);
  const networks = Array.from(new Set(policy.networks.map((entry) => entry.network))).sort();
  const flattened = ["v=spf1", ...networks, policy.terminal].join(" ");
  // Conservatively refuse large DNS answers; never truncate or issue multiple SPF records.
  if (flattened.length > 450)
    throw new FlattenError("OUTPUT_TOO_LARGE", domain);
  const sources = Array.from(
    new Map(
      policy.networks.map((entry) => [JSON.stringify(entry), entry]),
    ).values(),
  );
  const chunks = flattened.match(/.{1,255}/g) || [];
  return {
    domain,
    original: policy.record,
    flattened,
    generatedAt: new Date().toISOString(),
    dependencies: cache.size - 1,
    lookupTerms: policy.lookupTerms,
    sources,
    zoneValue: chunks.map((chunk) => `"${chunk}"`).join(" "),
  };
}
