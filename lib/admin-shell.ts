export type AdminShellStatus = "allowed" | "locked";

export type AdminShellSection = {
  id: "cases" | "spf-route-audit" | "abuse-decisions" | "provider-health" | "operational-events" | "company-onboarding";
  title: string;
  description: string;
  status: string;
  affordance: string;
  scope: "global-owner";
  endpoint?: string;
};

export type AdminShellModel = {
  status: AdminShellStatus;
  eyebrow: string;
  title: string;
  description: string;
  sections: AdminShellSection[];
};

type AdminShellModelInput = {
  allowed: boolean;
};

type ProviderHealthPayload = Record<string, unknown>;

type OperationalEventsPayload = {
  events?: unknown;
};

type SPFRoutePublicationAuditPayload = Record<string, unknown>;

type LabelValue = {
  label: string;
  value: string;
};

export type ProviderHealthPanelModel = {
  status: "available" | "unavailable";
  title: string;
  description: string;
  generatedAtLabel: string;
  checks: LabelValue[];
  cadence: LabelValue[];
  build: LabelValue[];
  notice?: string;
};

export type OperationalEventSummary = {
  id: string;
  kind: string;
  severity: string;
  message: string;
  actor?: string;
  resource?: string;
  occurredAt: string;
  metadata: LabelValue[];
};

export type OperationalEventsPanelModel = {
  status: "available" | "unavailable";
  title: string;
  description: string;
  events: OperationalEventSummary[];
  notice?: string;
};

export type DNSAuditRecord = {
  label: string;
  value: string;
  meta?: string;
};

export type DNSAuditEvidence = {
  label: string;
  status: string;
  values: string[];
};

export type SPFRoutePublicationAuditPanelModel = {
  status: "available" | "unavailable";
  title: string;
  description: string;
  routeID: string;
  routeFQDN: string;
  statusLabel: string;
  driftStatus: string;
  propagationStatus: string;
  expectedTXT: DNSAuditRecord[];
  expectedCNAME: DNSAuditRecord[];
  liveDNS: DNSAuditEvidence[];
  publishMetadata: LabelValue[];
  notice?: string;
};

const ADMIN_SECTIONS: AdminShellSection[] = [
  {
    id: "cases",
    title: "Cases",
    description: "Triage global support, remediation, and incident cases from the private backend admin surface.",
    status: "Shell only",
    affordance: "Use the server-side /api/admin proxy when backend case endpoints are ready.",
    scope: "global-owner",
  },
  {
    id: "spf-route-audit",
    title: "SPF route publication audit",
    description: "Inspect expected SPF route DNS records, persisted Bunny state, live recursive evidence, and DNS publication drift for a route.",
    status: "Backend endpoint ready",
    affordance: "Fetch read-only audit evidence through the owner-gated admin proxy after selecting a route ID.",
    endpoint: "/api/admin/spf-routes/{routeID}/publication-audit",
    scope: "global-owner",
  },
  {
    id: "abuse-decisions",
    title: "Abuse decisions",
    description: "Review owner-level abuse decisions, holds, and enforcement notes without exposing client dashboard controls.",
    status: "Shell only",
    affordance: "Keep actions server-mediated; no browser token access.",
    scope: "global-owner",
  },
  {
    id: "provider-health",
    title: "Provider and dependency health",
    description: "Track Bunny DNS configuration, bootstrap state, SPF route scheduler cadence, and non-secret build metadata for operator awareness.",
    status: "Backend endpoint ready",
    affordance: "Fetch read-only provider/dependency health through the owner-gated admin proxy; render only booleans, cadence, and build metadata.",
    endpoint: "/api/admin/provider-health",
    scope: "global-owner",
  },
  {
    id: "operational-events",
    title: "Recent operational events",
    description: "Review recent global audit, incident, and operational event summaries from the backend event store.",
    status: "Backend endpoint ready",
    affordance: "Fetch redacted event summaries through the owner-gated admin proxy and keep raw provider details out of browser logs.",
    endpoint: "/api/admin/operational-events?severity=error&limit=20",
    scope: "global-owner",
  },
  {
    id: "company-onboarding",
    title: "Company and onboarding placeholder",
    description: "Placeholder for owner-managed company setup visibility; client organization dashboards stay separate.",
    status: "Placeholder",
    affordance: "Do not add public signup, billing, or subscription flows here.",
    scope: "global-owner",
  },
];

const SECRET_KEY_PATTERN = /(secret|token|password|passwd|api[_-]?key|credential|authorization|cookie|private|provider[_-]?response|raw|bunny)/i;
const SECRET_VALUE_PATTERN = /(secret|token|api[_ -]?key|bearer\s+|authorization|password|credential|-----BEGIN|bunny raw response)/i;
const MAX_METADATA_ITEMS = 8;

export function buildAdminShellModel({ allowed }: AdminShellModelInput): AdminShellModel {
  if (!allowed) {
    return {
      status: "locked",
      eyebrow: "Owner-only control plane",
      title: "Admin control plane locked",
      description: "Admin access requires an enabled server-side gate and a valid owner session. No backend admin affordances are shown without both.",
      sections: [],
    };
  }

  return {
    status: "allowed",
    eyebrow: "Owner-only control plane",
    title: "Dmark operator control plane",
    description: "A private shell for global Dmark operations. It is intentionally separate from client organization dashboards and exposes only proxy-aware placeholders until backend admin contracts are implemented.",
    sections: ADMIN_SECTIONS.map((section) => ({ ...section })),
  };
}

export async function fetchAdminProviderHealth(): Promise<ProviderHealthPayload> {
  return fetchAdminJson("/api/admin/provider-health");
}

export async function fetchAdminOperationalEvents(): Promise<OperationalEventsPayload> {
  return fetchAdminJson("/api/admin/operational-events?severity=error&limit=20");
}

export async function fetchAdminSPFRoutePublicationAudit(routeID: string): Promise<SPFRoutePublicationAuditPayload> {
  const normalizedRouteID = routeID.trim();
  if (!normalizedRouteID) {
    throw new Error("SPF route ID is required.");
  }

  return fetchAdminJson(`/api/admin/spf-routes/${encodeURIComponent(normalizedRouteID)}/publication-audit`);
}

export function buildProviderHealthPanelModel(payload?: ProviderHealthPayload | null): ProviderHealthPanelModel {
  if (!payload) return unavailableProviderHealthPanel();

  return {
    status: "available",
    title: "Provider and dependency health",
    description: "Read-only provider configuration, bootstrap, scheduler, and build metadata from the owner admin proxy.",
    generatedAtLabel: safeString(payload.generated_at) || "Unknown",
    checks: [
      { label: "Public base URL", value: configuredLabel(payload.public_base_url_configured) },
      { label: "Bunny DNS", value: configuredLabel(payload.bunny_dns_configured) },
      { label: "Bunny DNS zone ID", value: configuredLabel(payload.bunny_dns_zone_id_configured) },
      { label: "Bootstrap", value: configuredLabel(payload.bootstrap_configured) },
      { label: "Bootstrap partially configured", value: yesNoLabel(payload.bootstrap_partially_configured) },
      { label: "Bootstrap skipped", value: yesNoLabel(payload.bootstrap_skipped) },
      { label: "SPF route scheduler", value: enabledLabel(payload.spf_route_scheduler_enabled) },
    ],
    cadence: [
      { label: "Scheduler interval", value: safeString(payload.spf_route_scheduler_interval) || "Unknown" },
      { label: "Scheduled sync cadence", value: safeString(payload.spf_route_scheduled_sync_cadence) || "Unknown" },
    ],
    build: [
      { label: "Version", value: safeString(payload.version) || "Unknown" },
      { label: "Commit", value: shortCommit(payload.commit) },
      { label: "Build time", value: safeString(payload.build_time) || "Unknown" },
    ],
  };
}

export function buildOperationalEventsPanelModel(payload?: OperationalEventsPayload | null): OperationalEventsPanelModel {
  if (!payload || !Array.isArray(payload.events)) return unavailableOperationalEventsPanel();

  return {
    status: "available",
    title: "Recent operational events",
    description: "Latest error-severity operational summaries from the owner admin proxy with metadata defensively redacted.",
    events: payload.events.map(mapOperationalEvent).filter((event): event is OperationalEventSummary => event !== null),
  };
}

export function buildSPFRoutePublicationAuditPanelModel(payload?: SPFRoutePublicationAuditPayload | null): SPFRoutePublicationAuditPanelModel {
  if (!payload) return unavailableSPFRoutePublicationAuditPanel();

  const expectedRecords = asRecord(payload.expected_records) ?? asRecord(payload.expected) ?? payload;
  const liveDNS = asRecord(payload.live_dns) ?? asRecord(payload.live) ?? {};
  const lastPublish = asRecord(payload.last_publish) ?? asRecord(payload.last_published) ?? {};
  const lastGood = asRecord(payload.last_good) ?? {};
  const expectedTXT = mapExpectedRecords(expectedRecords.txt ?? expectedRecords.txt_records ?? payload.expected_txt_records, "value");
  const expectedCNAME = mapExpectedRecords(expectedRecords.cname ?? expectedRecords.cname_records ?? payload.expected_cname_records, "target");

  return {
    status: "available",
    title: "SPF route publication audit",
    description: "Expected route records compared with live authoritative and recursive DNS evidence from the owner admin proxy.",
    routeID: safeString(payload.route_id) || safeString(payload.id) || "Unknown",
    routeFQDN: safeString(payload.route_fqdn) || safeString(payload.fqdn) || expectedTXT[0]?.label || "Unknown",
    statusLabel: safeString(payload.status) || safeString(payload.last_sync_status) || "Unknown",
    driftStatus: safeString(payload.drift_status) || safeString(payload.drift) || safeString(payload.propagation_status) || "Unknown",
    propagationStatus: safeString(payload.propagation_status) || safeString(payload.propagation) || "Unknown",
    expectedTXT,
    expectedCNAME,
    liveDNS: [
      mapLiveDNS("Authoritative", liveDNS.authoritative ?? payload.authoritative),
      mapLiveDNS("Recursive", liveDNS.recursive ?? payload.recursive),
    ].filter((item): item is DNSAuditEvidence => item !== null),
    publishMetadata: mapPublicationMetadata(payload, lastPublish, lastGood),
  };
}

export function unavailableProviderHealthPanel(): ProviderHealthPanelModel {
  return {
    status: "unavailable",
    title: "Provider and dependency health",
    description: "Read-only provider configuration, bootstrap, scheduler, and build metadata from the owner admin proxy.",
    generatedAtLabel: "Unavailable",
    checks: [],
    cadence: [],
    build: [],
    notice: "Provider health is temporarily unavailable. No provider credentials or backend details were exposed.",
  };
}

export function unavailableOperationalEventsPanel(): OperationalEventsPanelModel {
  return {
    status: "unavailable",
    title: "Recent operational events",
    description: "Latest error-severity operational summaries from the owner admin proxy with metadata defensively redacted.",
    events: [],
    notice: "Operational events are temporarily unavailable. No provider credentials or backend details were exposed.",
  };
}

export function unavailableSPFRoutePublicationAuditPanel(routeID = ""): SPFRoutePublicationAuditPanelModel {
  return {
    status: "unavailable",
    title: "SPF route publication audit",
    description: "Expected route records compared with live authoritative and recursive DNS evidence from the owner admin proxy.",
    routeID: routeID || "Not selected",
    routeFQDN: "Unavailable",
    statusLabel: "Unavailable",
    driftStatus: "Unavailable",
    propagationStatus: "Unavailable",
    expectedTXT: [],
    expectedCNAME: [],
    liveDNS: [],
    publishMetadata: [],
    notice: routeID
      ? "Publication audit is temporarily unavailable. No provider credentials or backend details were exposed."
      : "Enter a route ID to fetch read-only publication audit evidence.",
  };
}

async function fetchAdminJson(path: string) {
  const response = await fetch(path, { cache: "no-store", headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error("Admin read-only panel request failed.");
  }
  return response.json();
}

function mapOperationalEvent(raw: unknown): OperationalEventSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const event = raw as Record<string, unknown>;
  const id = safeString(event.id);
  const kind = safeString(event.kind);
  const severity = safeString(event.severity);
  const message = safeString(event.message);
  const occurredAt = safeString(event.occurred_at);
  if (!id || !kind || !severity || !message || !occurredAt) return null;

  return {
    id,
    kind,
    severity,
    message,
    actor: safeString(event.actor) || undefined,
    resource: safeString(event.resource) || undefined,
    occurredAt,
    metadata: sanitizeMetadata(event.metadata),
  };
}

function sanitizeMetadata(metadata: unknown): LabelValue[] {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return [];
  const rows: LabelValue[] = [];
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (rows.length >= MAX_METADATA_ITEMS) break;
    if (!isSafeMetadataKey(key) || !isSafeMetadataValue(value)) continue;
    rows.push({ label: key, value: String(value) });
  }
  return rows;
}

function mapExpectedRecords(value: unknown, valueKey: "value" | "target"): DNSAuditRecord[] {
  if (Array.isArray(value)) return value.map((item) => mapExpectedRecord(item, valueKey)).filter((item): item is DNSAuditRecord => item !== null);
  const singleRecord = mapExpectedRecord(value, valueKey);
  return singleRecord ? [singleRecord] : [];
}

function mapExpectedRecord(value: unknown, valueKey: "value" | "target"): DNSAuditRecord | null {
  if (typeof value === "string") {
    const rendered = safeDNSValue(value);
    return rendered ? { label: "Record", value: rendered } : null;
  }
  const record = asRecord(value);
  if (!record) return null;

  const label = safeDNSValue(record.name) || safeDNSValue(record.record_name) || "Record";
  const renderedValue = safeDNSValue(record[valueKey]) || safeDNSValue(record.record_value) || safeDNSValue(record.value);
  if (!renderedValue) return null;

  const ttl = safeString(record.ttl);
  return {
    label,
    value: renderedValue,
    ...(ttl ? { meta: `TTL ${ttl}` } : {}),
  };
}

function mapLiveDNS(label: string, value: unknown): DNSAuditEvidence | null {
  const evidence = asRecord(value);
  if (!evidence) return null;
  const txtRecord = asRecord(evidence.txt);
  const cnameRecord = asRecord(evidence.cname);

  const values = [
    ...safeStringArray(txtRecord?.values ?? evidence.txt).map((item) => `TXT ${item}`),
    ...safeStringArray(evidence.txt_records).map((item) => `TXT ${item}`),
    ...safeStringArray(cnameRecord?.values ?? evidence.cname).map((item) => `CNAME ${item}`),
    ...safeStringArray(evidence.cname_records).map((item) => `CNAME ${item}`),
  ];
  const status = [safeString(txtRecord?.status), safeString(cnameRecord?.status)].filter(Boolean).join(" / ") || safeString(evidence.status);

  if (values.length === 0 && !status) return null;

  return {
    label,
    status: status || "Unknown",
    values,
  };
}

function mapPublicationMetadata(payload: Record<string, unknown>, lastPublish: Record<string, unknown>, lastGood: Record<string, unknown>): LabelValue[] {
  const rows: LabelValue[] = [];
  addMetadataRow(rows, "Last sync status", payload.last_sync_status);
  addMetadataRow(rows, "Last synced at", payload.last_synced_at);
  addMetadataRow(rows, "Bunny record ID", payload.bunny_record_id);
  addMetadataRow(rows, "Last generated SPF", payload.last_generated_spf);
  addMetadataRow(rows, "Last published SPF", payload.last_published_spf);
  addMetadataRow(rows, "Last known good SPF", payload.last_known_good_spf);
  addMetadataRow(rows, "Last publish status", lastPublish.status);
  addMetadataRow(rows, "Last published at", lastPublish.published_at ?? lastPublish.at);
  addMetadataRow(rows, "Last publish job", lastPublish.job_id ?? lastPublish.id);
  addMetadataRow(rows, "Last good check", lastGood.checked_at ?? lastGood.at);
  addMetadataRow(rows, "Last good source", lastGood.source);
  return rows;
}

function addMetadataRow(rows: LabelValue[], label: string, value: unknown) {
  const rendered = safeDNSValue(value);
  if (rendered) rows.push({ label, value: rendered });
}

function isSafeMetadataKey(key: string): boolean {
  return key.length > 0 && key.length <= 64 && !SECRET_KEY_PATTERN.test(key);
}

function isSafeMetadataValue(value: unknown): value is string | number | boolean {
  if (!["string", "number", "boolean"].includes(typeof value)) return false;
  const rendered = String(value);
  return rendered.length <= 160 && !SECRET_VALUE_PATTERN.test(rendered);
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function safeDNSValue(value: unknown): string {
  const rendered = safeString(value);
  if (!rendered) return "";
  return SECRET_VALUE_PATTERN.test(rendered) ? "[REDACTED]" : rendered;
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeDNSValue(item)).filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function configuredLabel(value: unknown): string {
  return value === true ? "Configured" : value === false ? "Not configured" : "Unknown";
}

function yesNoLabel(value: unknown): string {
  return value === true ? "Yes" : value === false ? "No" : "Unknown";
}

function enabledLabel(value: unknown): string {
  return value === true ? "Enabled" : value === false ? "Disabled" : "Unknown";
}

function shortCommit(value: unknown): string {
  const commit = safeString(value);
  return commit ? commit.slice(0, 7) : "Unknown";
}
