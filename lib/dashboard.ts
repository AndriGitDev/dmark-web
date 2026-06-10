import type {
  BackendDashboardAlert,
  BackendDashboardAlertsResponse,
  BackendDashboardBrandRiskFinding,
  BackendDashboardBrandRiskResponse,
  BackendDashboardChangePlanResponse,
  BackendDashboardDNSChange,
  BackendDashboardDNSGuidanceResponse,
  BackendDashboardDNSInstruction,
  BackendDashboardDNSProviderDetection,
  BackendDashboardDomain,
  BackendDashboardLookalikeRiskSignal,
  BackendDashboardPlanResponse,
  BackendDashboardReporterResponse,
  BackendDashboardResponse,
  BackendDashboardRecheckResponse,
  BackendDashboardSender,
  BackendDashboardSettingsResponse,
  BackendDashboardSPFRouteEvidence,
  BackendDashboardSPFRouteHistoryResponse,
  BackendDashboardSPFRouteResponse,
  BackendDashboardSPFRouteSource,
  BackendDashboardSPFRouteSyncResponse,
  BackendDashboardTrendsResponse,
} from "@/lib/dashboard-api";

export class DashboardRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DashboardRequestError";
    this.status = status;
  }
}

export function isDashboardSessionExpiredError(error: unknown): boolean {
  return error instanceof DashboardRequestError && error.status === 401;
}

export type DomainStatus = "protected" | "needs-work" | "monitoring";
export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type DashboardIconName =
  | "alert-triangle"
  | "check-circle"
  | "database-zap"
  | "gauge"
  | "key"
  | "mail-check"
  | "shield-alert"
  | "shield-check";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: "blue" | "green" | "amber" | "red";
  icon: DashboardIconName;
};

export type ProtectedDomain = {
  id: string;
  domain: string;
  owner: string;
  status: DomainStatus;
  score: number;
  dmarcPolicy: "none" | "quarantine" | "reject";
  spfLookups: number;
  dkimCoverage: number;
  alignmentRate: number;
  unknownSenders: number;
  lastChecked: string;
  nextAction: string;
};

export type SenderSource = {
  id: string;
  provider: string;
  sourceIP?: string;
  volume: string;
  volumeCount: number;
  aligned: number;
  unknown: boolean;
  trend: string;
  risk?: string;
};

export type DashboardAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  domain: string;
  detail: string;
  age: string;
};

export type Recommendation = {
  id: string;
  title: string;
  domain: string;
  impact: string;
  effort: "Low" | "Medium" | "High";
  due: string;
};

export type ActivityEvent = {
  title: string;
  detail: string;
  time: string;
  icon: DashboardIconName;
};

export type DashboardViewModel = {
  generatedAt?: string;
  metrics: DashboardMetric[];
  protectedDomains: ProtectedDomain[];
  recommendations: Recommendation[];
  activityEvents: ActivityEvent[];
};

export type ChangePlanRow = {
  id: string;
  title: string;
  state: string;
  recordName?: string;
  recordType?: string;
  recordText: string;
  evidence?: string;
  risk?: string;
  rollbackNote?: string;
};

export type ChangePlanViewModel = {
  domainID: string;
  domain: string;
  generatedAt?: string;
  journeyState?: string;
  journeyReason?: string;
  journeyReadyForNext?: boolean;
  journeyBlockingSignals?: string[];
  policy?: string;
  policyPercent?: number;
  nextAction?: string;
  changes: ChangePlanRow[];
};

export type TrendScorePoint = {
  date: string;
  score: number;
  status: string;
};

export type TrendAlignmentPoint = {
  date: string;
  total: number;
  aligned: number;
  alignedPercentage: number;
};

export type TrendsViewModel = {
  domainID: string;
  domain: string;
  days: number;
  scorePoints: TrendScorePoint[];
  alignmentPoints: TrendAlignmentPoint[];
};

export type SPFRouteHistoryEvent = {
  kind: string;
  severity: string;
  message: string;
  occurredAt: string;
  jobID?: string;
  status?: string;
  errorClass?: string;
};

export type SPFRouteHistoryViewModel = {
  routeID: string;
  domainID: string;
  domain: string;
  events: SPFRouteHistoryEvent[];
};

export type PlanViewModel = {
  plan: string;
  savedDomainsLimit: number;
  savedDomainsUsed: number;
  savedDomainsRemaining: number;
  scanCadenceMinutes: number;
  reportRetentionDays: number;
  alertChannels: number;
  apiAccess: boolean;
  reporter: boolean;
  teams: boolean;
};

export type ReporterViewModel = {
  domainID: string;
  domain: string;
  reportVolume: string;
  alignedPercentage: number;
  reporterOrgCount: number;
  failures: string;
  rejectCandidates: number;
  setupGuidance?: string;
  senderSources: SenderSource[];
};

export type BrandRiskSeverity = "Info" | "Low" | "Medium" | "High" | "Critical";

export type BrandRiskFinding = {
  id: string;
  category: string;
  type: string;
  title: string;
  severity: BrandRiskSeverity;
  evidence: string;
  recommendedAction: string;
};

export type LookalikeRiskSignal = {
  id: string;
  domain: string;
  kind: string;
  reason: string;
  hasAddressRecords: boolean;
  hasMXRecords: boolean;
  severity: BrandRiskSeverity;
  evidence: string;
  recommendedAction: string;
  activeEvidence: boolean;
};

export type BrandRiskViewModel = {
  domainID: string;
  domain: string;
  generatedAt?: string;
  findings: BrandRiskFinding[];
  lookalikes: LookalikeRiskSignal[];
};

export type SettingsState = {
  alignmentThreshold: number;
  pauseOnUnknownSpike: boolean;
  monthlyReports: boolean;
  notificationChannels: string[];
  updatedAt?: string;
};

export type SPFRouteSource = {
  kind: string;
  value: string;
  label: string;
};

export type SPFRouteEvidence = {
  sourceValue?: string;
  resolvedDomain?: string;
  mechanism?: string;
  kind?: string;
  message: string;
};

export type SPFRouteViewModel = {
  id: string;
  domainID: string;
  domain: string;
  status: string;
  routeFQDN?: string;
  customerCNAMEName?: string;
  customerCNAMETarget?: string;
  generatedSPFPreview?: string;
  lastPublishedSPF?: string;
  lastSyncedAt?: string;
  lastSyncError?: string;
  enabledSources: SPFRouteSource[];
  evidenceSummary: SPFRouteEvidence[];
};

export type SPFRoutePanelModel = {
  heading: string;
  statusLabel: string;
  statusTone: "green" | "amber" | "red" | "blue";
  cnameInstruction: string;
  routeTarget: string;
  generatedSPFPreview: string;
  lastPublishedSPF: string;
  lastSyncLabel: string;
  errorSummary?: string;
  sourceLabels: string[];
  evidenceLabels: string[];
};

export type DNSGuidanceInstruction = {
  kind: string;
  recordName: string;
  recordType: string;
  recordValue: string;
  ttl: number;
  providerID?: string;
  providerName: string;
  dashboardURL?: string;
  steps: string[];
  record: string;
};

export type DNSGuidanceViewModel = {
  domainID: string;
  domain: string;
  generatedAt?: string;
  status: string;
  providerID?: string;
  providerName?: string;
  confidence: string;
  evidenceNameservers: string[];
  dnsDashboardURL?: string;
  resolverError?: string;
  instructions: DNSGuidanceInstruction[];
  statusLabel: string;
  statusTone: "green" | "amber" | "red" | "blue";
  confidenceLabel: string;
};

export type DashboardInitialState = {
  dashboard: DashboardViewModel;
  alerts: DashboardAlert[];
  settings: SettingsState;
  notice: string;
};

export type RecheckResult = {
  jobID?: string;
  checkID?: string;
  domainID: string;
  status: string;
  queuedAt?: string;
  nextAllowedAt?: string;
};

export type SPFRouteSyncResult = {
  jobID?: string;
  domainID: string;
  status: string;
  queuedAt?: string;
};

export const mockProtectedDomains: ProtectedDomain[] = [
  {
    id: "kastro",
    domain: "kastro.is",
    owner: "Dmark",
    status: "protected",
    score: 98,
    dmarcPolicy: "reject",
    spfLookups: 6,
    dkimCoverage: 100,
    alignmentRate: 99.2,
    unknownSenders: 0,
    lastChecked: "4 min ago",
    nextAction: "Keep monitoring weekly sender drift.",
  },
  {
    id: "northwind",
    domain: "northwind.is",
    owner: "Dmark",
    status: "needs-work",
    score: 64,
    dmarcPolicy: "none",
    spfLookups: 13,
    dkimCoverage: 0,
    alignmentRate: 87.1,
    unknownSenders: 4,
    lastChecked: "16 min ago",
    nextAction: "Flatten SPF and move DMARC to quarantine at 25%.",
  },
  {
    id: "reknet",
    domain: "reknet.is",
    owner: "Dmark",
    status: "monitoring",
    score: 82,
    dmarcPolicy: "quarantine",
    spfLookups: 9,
    dkimCoverage: 100,
    alignmentRate: 94.8,
    unknownSenders: 2,
    lastChecked: "41 min ago",
    nextAction: "Validate Sendgrid DKIM before p=reject.",
  },
];

export const mockSenderSources: SenderSource[] = [
  { id: "m365", provider: "Microsoft 365", volume: "842k", volumeCount: 842000, aligned: 99.8, unknown: false, trend: "stable" },
  { id: "google", provider: "Google Workspace", volume: "391k", volumeCount: 391000, aligned: 98.4, unknown: false, trend: "stable" },
  { id: "sendgrid", provider: "Sendgrid", volume: "184k", volumeCount: 184000, aligned: 92.1, unknown: false, trend: "rising" },
  { id: "unknown-asn", provider: "Unclassified ASN 1299", volume: "18k", volumeCount: 18000, aligned: 41.7, unknown: true, trend: "new" },
];

export const mockDashboardAlerts: DashboardAlert[] = [
  {
    id: "a1",
    severity: "critical",
    title: "DMARC policy relaxed to p=none",
    domain: "northwind.is",
    detail: "Record changed after the last registrar edit. Enforcement is no longer active.",
    age: "12 min",
  },
  {
    id: "a2",
    severity: "medium",
    title: "Unknown sender detected",
    domain: "reknet.is",
    detail: "DMARC aggregate reports include a new source that is failing DKIM alignment.",
    age: "2 hr",
  },
];

export const mockChangePlan: ChangePlanViewModel = {
  domainID: "northwind",
  domain: "northwind.is",
  journeyState: "ready_for_quarantine",
  nextAction: "Move the domain to quarantine after sender cleanup.",
  changes: [
    {
      id: "spf-flatten",
      title: "SPF flatten",
      recordName: "@",
      recordType: "TXT",
      recordText: "v=spf1 include:_dmark.northwind.is include:spf.protection.outlook.com -all",
      state: "ready",
      evidence: "SPF currently exceeds the lookup budget.",
      risk: "DNS lookup failures can leave legitimate mail unauthenticated.",
      rollbackNote: "Restore the previous SPF TXT record if delivery anomalies appear.",
    },
    {
      id: "dmarc-quarantine",
      title: "DMARC quarantine",
      recordName: "_dmarc",
      recordType: "TXT",
      recordText: "v=DMARC1; p=quarantine; pct=25; rua=mailto:dmarc@northwind.is",
      state: "review",
      evidence: "Reporter evidence supports a gradual enforcement step.",
      risk: "Unknown senders may be quarantined if they are not classified first.",
      rollbackNote: "Move p=quarantine back to p=none while sender evidence is reviewed.",
    },
  ],
};

export const mockReporterView: ReporterViewModel = {
  domainID: "kastro",
  domain: "kastro.is",
  reportVolume: "1.4M",
  alignedPercentage: 96.4,
  reporterOrgCount: 14,
  failures: "64k",
  rejectCandidates: 4,
  senderSources: mockSenderSources,
};

export const mockSettings: SettingsState = {
  alignmentThreshold: 95,
  pauseOnUnknownSpike: true,
  monthlyReports: false,
  notificationChannels: ["email", "slack"],
};

export const mockBrandRiskView: BrandRiskViewModel = {
  domainID: "northwind",
  domain: "northwind.is",
  generatedAt: new Date().toISOString(),
  findings: [
    {
      id: "dmarc-policy",
      category: "Email authentication",
      type: "dmarc-policy",
      title: "DMARC enforcement is not complete",
      severity: "Medium",
      evidence: "The current DMARC policy allows some unauthenticated mail to pass without enforcement.",
      recommendedAction: "Move to quarantine or reject once Reporter evidence shows expected senders are aligned.",
    },
  ],
  lookalikes: [
    {
      id: "n0rthwind-is",
      domain: "n0rthwind.is",
      kind: "typo",
      reason: "Digit substitution in the registered label.",
      hasAddressRecords: true,
      hasMXRecords: true,
      severity: "High",
      evidence: "Address and MX records are visible for this candidate.",
      recommendedAction: "Review registration ownership and consider defensive action.",
      activeEvidence: true,
    },
    {
      id: "northwínd-is",
      domain: "northwínd.is",
      kind: "homoglyph",
      reason: "Accent variation of the protected domain.",
      hasAddressRecords: false,
      hasMXRecords: false,
      severity: "Info",
      evidence: "No DNS address or MX evidence is currently observed.",
      recommendedAction: "Track as an inactive candidate; do not treat as a confirmed threat.",
      activeEvidence: false,
    },
  ],
};

export function mockTrendsPayload(domainID: string, domainName: string, days: number): BackendDashboardTrendsResponse {
  const scorePoints = [];
  const alignmentPoints = [];
  const today = new Date();
  const points = Math.min(days, 30);
  for (let index = points - 1; index >= 0; index -= 1) {
    const date = new Date(today.getTime() - index * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const score = Math.max(40, Math.min(98, 62 + Math.round((points - index) * 1.2) + ((index * 7) % 5) - 2));
    const total = 1800 + ((index * 131) % 700);
    const aligned = Math.round(total * Math.min(0.995, 0.86 + (points - index) * 0.004));
    scorePoints.push({ date, score, status: score >= 90 ? "pass" : score >= 70 ? "warn" : "fail" });
    alignmentPoints.push({ date, total, aligned, aligned_percentage: Math.round((aligned / total) * 1000) / 10 });
  }
  return {
    domain_id: domainID,
    domain: domainName,
    generated_at: new Date().toISOString(),
    days,
    score_points: scorePoints,
    alignment_points: alignmentPoints,
  };
}

export function mockSPFRouteHistoryPayload(domainID: string, domainName: string): BackendDashboardSPFRouteHistoryResponse {
  const now = Date.now();
  return {
    route_id: `mock-spf-route-${domainID}`,
    domain_id: domainID,
    domain: domainName,
    generated_at: new Date().toISOString(),
    events: [
      {
        kind: "dashboard.spf_route.sync_queued",
        severity: "info",
        message: "dashboard SPF route sync queued",
        occurred_at: new Date(now - 10 * 60 * 1000).toISOString(),
        metadata: { job_id: "mock-job-3", status: "queued" },
      },
      {
        kind: "dashboard.spf_route.upserted",
        severity: "info",
        message: "dashboard SPF route upserted",
        occurred_at: new Date(now - 11 * 60 * 1000).toISOString(),
        metadata: { sources_count: 2 },
      },
      {
        kind: "dashboard.spf_route.sync_failed",
        severity: "error",
        message: "dashboard SPF route sync queue failed",
        occurred_at: new Date(now - 26 * 60 * 60 * 1000).toISOString(),
        metadata: { error_class: "queue_error" },
      },
    ],
  };
}

export const mockPlanPayload: BackendDashboardPlanResponse = {
  plan: "monitor",
  saved_domains_limit: 10,
  saved_domains_used: 3,
  saved_domains_remaining: 7,
  scan_cadence_minutes: 720,
  report_retention_days: 30,
  alert_channels: 1,
  api_access: false,
  reporter: false,
  teams: false,
};

export const mockDashboardViewModel: DashboardViewModel = dashboardViewModelFromDomains(
  mockProtectedDomains,
  mockDashboardAlerts.length,
  new Date().toISOString(),
);

export function mapDashboardResponse(payload: BackendDashboardResponse): DashboardViewModel {
  const domains = (payload.domains || []).map(mapBackendDomain);
  return dashboardViewModelFromDomains(domains, payload.alert_count || 0, payload.generated_at, {
    protectedDomainCount: payload.protected_domain_count,
    averageScore: payload.average_score,
    unknownSenderCount: payload.unknown_sender_count,
  });
}

export function mapBackendDomain(payload: BackendDashboardDomain): ProtectedDomain {
  return {
    id: payload.id,
    domain: payload.domain,
    owner: "Dmark",
    status: mapDomainStatus(payload.status),
    score: numberOrZero(payload.score),
    dmarcPolicy: mapDMARCPolicy(payload.dmarc_policy),
    spfLookups: numberOrZero(payload.spf_lookup_count),
    dkimCoverage: mapDKIMCoverage(payload.dkim_coverage),
    alignmentRate: roundOne(payload.alignment_rate),
    unknownSenders: numberOrZero(payload.unknown_sender_count),
    lastChecked: formatRelativeTime(payload.last_checked_at),
    nextAction: payload.next_action || "Review domain posture and sender alignment.",
  };
}

export function mapAlertsResponse(payload: BackendDashboardAlertsResponse): DashboardAlert[] {
  return (payload.alerts || []).map(mapBackendAlert);
}

export function mapBackendAlert(payload: BackendDashboardAlert): DashboardAlert {
  return {
    id: payload.id,
    severity: mapAlertSeverity(payload.severity),
    title: payload.message || `${payload.check_name || "Dashboard"} alert`,
    domain: payload.domain,
    detail: payload.evidence || payload.kind || "Review the latest finding.",
    age: formatRelativeTime(payload.created_at),
  };
}

export function mapChangePlanResponse(payload: BackendDashboardChangePlanResponse): ChangePlanViewModel {
  return {
    domainID: payload.domain_id,
    domain: payload.domain,
    generatedAt: payload.generated_at,
    journeyState: payload.journey_state,
    journeyReason: payload.journey_reason,
    journeyReadyForNext: payload.journey_ready_for_next,
    journeyBlockingSignals: payload.journey_blocking_signals || [],
    policy: payload.policy,
    policyPercent: payload.policy_percent,
    nextAction: payload.next_action,
    changes: (payload.changes || []).map(mapChangePlanRow),
  };
}

export function mapTrendsResponse(payload: BackendDashboardTrendsResponse): TrendsViewModel {
  return {
    domainID: payload.domain_id,
    domain: payload.domain,
    days: numberOrZero(payload.days),
    scorePoints: (payload.score_points || []).map((point) => ({
      date: point.date,
      score: numberOrZero(point.score),
      status: point.status || "unknown",
    })),
    alignmentPoints: (payload.alignment_points || []).map((point) => ({
      date: point.date,
      total: numberOrZero(point.total),
      aligned: numberOrZero(point.aligned),
      alignedPercentage: roundOne(point.aligned_percentage),
    })),
  };
}

export function mapSPFRouteHistoryResponse(payload: BackendDashboardSPFRouteHistoryResponse): SPFRouteHistoryViewModel {
  return {
    routeID: payload.route_id,
    domainID: payload.domain_id,
    domain: payload.domain,
    events: (payload.events || []).map((event) => ({
      kind: event.kind,
      severity: event.severity,
      message: event.message,
      occurredAt: event.occurred_at,
      jobID: typeof event.metadata?.job_id === "string" ? event.metadata.job_id : undefined,
      status: typeof event.metadata?.status === "string" ? event.metadata.status : undefined,
      errorClass: typeof event.metadata?.error_class === "string" ? event.metadata.error_class : undefined,
    })),
  };
}

export function mapPlanResponse(payload: BackendDashboardPlanResponse): PlanViewModel {
  return {
    plan: payload.plan || "free",
    savedDomainsLimit: numberOrZero(payload.saved_domains_limit),
    savedDomainsUsed: numberOrZero(payload.saved_domains_used),
    savedDomainsRemaining: numberOrZero(payload.saved_domains_remaining),
    scanCadenceMinutes: numberOrZero(payload.scan_cadence_minutes),
    reportRetentionDays: numberOrZero(payload.report_retention_days),
    alertChannels: numberOrZero(payload.alert_channels),
    apiAccess: Boolean(payload.api_access),
    reporter: Boolean(payload.reporter),
    teams: Boolean(payload.teams),
  };
}

export function mapChangePlanRow(payload: BackendDashboardDNSChange): ChangePlanRow {
  return {
    id: payload.id,
    title: payload.title,
    state: payload.status,
    recordName: payload.record_name,
    recordType: payload.record_type,
    recordText: payload.record_text,
    evidence: payload.evidence,
    risk: payload.risk,
    rollbackNote: payload.rollback_note,
  };
}

export function mapReporterResponse(payload: BackendDashboardReporterResponse): ReporterViewModel {
  return {
    domainID: payload.domain_id,
    domain: payload.domain,
    reportVolume: compactNumber(payload.report_volume),
    alignedPercentage: roundOne(payload.aligned_percentage),
    reporterOrgCount: numberOrZero(payload.reporter_org_count),
    failures: compactNumber(payload.failures),
    rejectCandidates: numberOrZero(payload.reject_candidates),
    setupGuidance: payload.setup_guidance,
    senderSources: (payload.sender_inventory || []).map(mapSenderSource),
  };
}

export function mapBrandRiskResponse(payload: BackendDashboardBrandRiskResponse): BrandRiskViewModel {
  return {
    domainID: payload.domain_id,
    domain: payload.domain,
    generatedAt: payload.generated_at,
    findings: (payload.findings || []).map(mapBrandRiskFinding),
    lookalikes: (payload.lookalikes || []).map(mapLookalikeRiskSignal),
  };
}

export function mapBrandRiskFinding(payload: BackendDashboardBrandRiskFinding, index: number): BrandRiskFinding {
  return {
    id: `${payload.category || "finding"}-${payload.type || index}-${index}`,
    category: payload.category || "Email authentication",
    type: payload.type || "finding",
    title: payload.title || "Brand-risk finding",
    severity: mapBrandRiskSeverity(payload.severity),
    evidence: payload.evidence || "No evidence details were returned.",
    recommendedAction: payload.recommended_action || "Review this finding.",
  };
}

export function mapLookalikeRiskSignal(payload: BackendDashboardLookalikeRiskSignal, index: number): LookalikeRiskSignal {
  const hasAddressRecords = Boolean(payload.has_address_records);
  const hasMXRecords = Boolean(payload.has_mx_records);
  return {
    id: `${payload.domain || "lookalike"}-${index}`,
    domain: payload.domain || "unknown-domain",
    kind: payload.kind || "lookalike",
    reason: payload.reason || "Potential brand lookalike.",
    hasAddressRecords,
    hasMXRecords,
    severity: mapBrandRiskSeverity(payload.severity),
    evidence: payload.evidence || "No DNS evidence was returned.",
    recommendedAction: payload.recommended_action || "Review this candidate.",
    activeEvidence: hasAddressRecords || hasMXRecords,
  };
}

export function mapSenderSource(payload: BackendDashboardSender): SenderSource {
  const provider = payload.provider || payload.source_ip || "Unknown sender";
  return {
    id: `${provider}-${payload.source_ip || ""}`,
    provider,
    sourceIP: payload.source_ip,
    volume: compactNumber(payload.volume),
    volumeCount: numberOrZero(payload.volume),
    aligned: roundOne(payload.aligned_percentage),
    unknown: payload.classification === "unknown" || payload.risk === "review",
    trend: payload.trend || "stable",
    risk: payload.risk,
  };
}

export function mapSettingsResponse(payload: BackendDashboardSettingsResponse): SettingsState {
  return {
    alignmentThreshold: clampThreshold(payload.require_alignment_before_reject),
    pauseOnUnknownSpike: Boolean(payload.pause_automation_on_unknown_senders_spike),
    monthlyReports: Boolean(payload.auto_generate_monthly_executive_reports),
    notificationChannels: payload.notification_channels || [],
    updatedAt: payload.updated_at,
  };
}

export function settingsToBackendPayload(settings: SettingsState): BackendDashboardSettingsResponse {
  return {
    require_alignment_before_reject: clampThreshold(settings.alignmentThreshold),
    pause_automation_on_unknown_senders_spike: settings.pauseOnUnknownSpike,
    auto_generate_monthly_executive_reports: settings.monthlyReports,
    notification_channels: settings.notificationChannels,
    updated_at: settings.updatedAt,
  };
}

export function mapSPFRouteResponse(payload: BackendDashboardSPFRouteResponse): SPFRouteViewModel {
  return {
    id: payload.id,
    domainID: payload.domain_id,
    domain: payload.domain,
    status: payload.status,
    routeFQDN: payload.route_fqdn,
    customerCNAMEName: payload.customer_cname_name,
    customerCNAMETarget: payload.customer_cname_target,
    generatedSPFPreview: payload.generated_spf_preview,
    lastPublishedSPF: payload.last_published_spf,
    lastSyncedAt: payload.last_synced_at,
    lastSyncError: payload.last_sync_error,
    enabledSources: (payload.enabled_sources || []).map(mapSPFRouteSource),
    evidenceSummary: (payload.evidence_summary || []).map(mapSPFRouteEvidence),
  };
}

export function mapSPFRouteSource(payload: BackendDashboardSPFRouteSource): SPFRouteSource {
  return {
    kind: payload.kind || "source",
    value: payload.value || "",
    label: payload.label || payload.value || payload.kind || "SPF source",
  };
}

export function mapSPFRouteEvidence(payload: BackendDashboardSPFRouteEvidence): SPFRouteEvidence {
  return {
    sourceValue: payload.source_value,
    resolvedDomain: payload.resolved_domain,
    mechanism: payload.mechanism,
    kind: payload.kind,
    message: payload.message || "No evidence details were returned.",
  };
}

export function buildSPFRoutePanelModel(route: SPFRouteViewModel): SPFRoutePanelModel {
  return {
    heading: `SPF route for ${route.domain}`,
    statusLabel: titleCaseStatus(route.status),
    statusTone: spfRouteStatusTone(route.status),
    cnameInstruction:
      route.customerCNAMEName && route.customerCNAMETarget
        ? `${route.customerCNAMEName} CNAME ${route.customerCNAMETarget}`
        : "CNAME delegation not returned yet.",
    routeTarget: route.customerCNAMETarget || route.routeFQDN || "Route target not returned yet.",
    generatedSPFPreview: route.generatedSPFPreview || "Generated SPF preview is not available yet.",
    lastPublishedSPF: route.lastPublishedSPF || "No SPF value has been published yet.",
    lastSyncLabel: route.lastSyncedAt ? formatRelativeTime(route.lastSyncedAt) : "not synced yet",
    errorSummary: route.lastSyncError,
    sourceLabels: route.enabledSources.map((source) => `${source.label} · ${source.kind}:${source.value}`),
    evidenceLabels: route.evidenceSummary.map((evidence) =>
      [evidence.mechanism || evidence.kind || evidence.sourceValue, evidence.message].filter(Boolean).join(" · "),
    ),
  };
}

export function mapDNSGuidanceResponse(payload: BackendDashboardDNSGuidanceResponse): DNSGuidanceViewModel {
  const detection = mapDNSProviderDetection(payload.detection);
  return {
    domainID: payload.domain_id,
    domain: payload.domain,
    generatedAt: payload.generated_at,
    status: detection.status,
    providerID: detection.providerID,
    providerName: detection.providerName,
    confidence: detection.confidence,
    evidenceNameservers: detection.evidenceNameservers,
    dnsDashboardURL: detection.dnsDashboardURL,
    resolverError: payload.resolver_error,
    instructions: (payload.instructions || []).map(mapDNSGuidanceInstruction),
    statusLabel: dnsGuidanceStatusLabel(detection.status, detection.providerName),
    statusTone: dnsGuidanceStatusTone(detection.status),
    confidenceLabel: `${detection.confidence || "unknown"} confidence`,
  };
}

function mapDNSProviderDetection(payload: BackendDashboardDNSProviderDetection) {
  return {
    status: payload.status || "unknown",
    providerID: payload.provider_id,
    providerName: payload.provider_name,
    confidence: payload.confidence || "unknown",
    evidenceNameservers: payload.evidence_nameservers || [],
    dnsDashboardURL: payload.dns_dashboard_url,
  };
}

export function mapDNSGuidanceInstruction(payload: BackendDashboardDNSInstruction): DNSGuidanceInstruction {
  const recordName = payload.record_name || "@";
  const recordType = payload.record_type || "TXT";
  const recordValue = payload.record_value || "";
  return {
    kind: payload.kind || "record",
    recordName,
    recordType,
    recordValue,
    ttl: numberOrZero(payload.ttl),
    providerID: payload.provider_id,
    providerName: payload.provider_name || "Generic DNS",
    dashboardURL: payload.dashboard_url,
    steps: payload.steps || [],
    record: [recordName, recordType, recordValue].filter(Boolean).join(" "),
  };
}

export async function getDashboardData(): Promise<DashboardViewModel> {
  return mapDashboardResponse(await dashboardJSON<BackendDashboardResponse>("/api/dashboard"));
}

export async function createDashboardDomain(domain: string): Promise<ProtectedDomain> {
  const payload = await dashboardJSON<BackendDashboardDomain>("/api/dashboard/domains", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ domain: domain.trim() }),
  });

  return mapBackendDomain(payload);
}

export async function getReporterData(domainID: string, filter?: "unknown"): Promise<ReporterViewModel> {
  const query = filter ? `?filter=${encodeURIComponent(filter)}` : "";
  return mapReporterResponse(await dashboardJSON<BackendDashboardReporterResponse>(`/api/dashboard/domains/${domainID}/reporter${query}`));
}

export async function getChangePlan(domainID: string): Promise<ChangePlanViewModel> {
  return mapChangePlanResponse(await dashboardJSON<BackendDashboardChangePlanResponse>(`/api/dashboard/domains/${domainID}/change-plan`));
}

export async function getTrendsData(domainID: string, days = 30): Promise<TrendsViewModel> {
  return mapTrendsResponse(
    await dashboardJSON<BackendDashboardTrendsResponse>(`/api/dashboard/domains/${domainID}/trends?days=${days}`),
  );
}

export async function getSPFRouteHistory(domainID: string, limit = 50): Promise<SPFRouteHistoryViewModel> {
  return mapSPFRouteHistoryResponse(
    await dashboardJSON<BackendDashboardSPFRouteHistoryResponse>(`/api/dashboard/domains/${domainID}/spf-route/history?limit=${limit}`),
  );
}

export async function getPlanData(): Promise<PlanViewModel> {
  return mapPlanResponse(await dashboardJSON<BackendDashboardPlanResponse>("/api/dashboard/plan"));
}

export async function getSPFRouteData(domainID: string): Promise<SPFRouteViewModel> {
  return mapSPFRouteResponse(await dashboardJSON<BackendDashboardSPFRouteResponse>(`/api/dashboard/domains/${domainID}/spf-route`));
}

export async function getDNSGuidanceData(domainID: string): Promise<DNSGuidanceViewModel> {
  return mapDNSGuidanceResponse(await dashboardJSON<BackendDashboardDNSGuidanceResponse>(`/api/dashboard/domains/${domainID}/dns-guidance`));
}

export async function syncSPFRoute(domainID: string): Promise<SPFRouteSyncResult> {
  const payload = await dashboardJSON<BackendDashboardSPFRouteSyncResponse>(`/api/dashboard/domains/${domainID}/spf-route/sync`, {
    method: "POST",
  });
  return {
    jobID: payload.job_id,
    domainID: payload.domain_id,
    status: payload.status,
    queuedAt: payload.queued_at,
  };
}

export async function saveSPFRouteSources(domainID: string, sources: SPFRouteSource[]): Promise<SPFRouteViewModel> {
  const payload = {
    enabled: sources.some((source) => source.value.trim()),
    mechanism_policy: "softfail",
    sources: sources
      .map((source) => ({
        kind: source.kind,
        value: source.value.trim(),
        label: source.label.trim(),
        enabled: true,
      }))
      .filter((source) => source.value),
  };

  return mapSPFRouteResponse(
    await dashboardJSON<BackendDashboardSPFRouteResponse>(`/api/dashboard/domains/${domainID}/spf-route`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function getBrandRiskData(
  domainID: string,
  options: { tld?: string; limit?: number; includeInactive?: boolean } = {},
): Promise<BrandRiskViewModel> {
  const query = new URLSearchParams();
  query.set("tld", options.tld || "is");
  query.set("limit", `${options.limit || 25}`);
  if (options.includeInactive) query.set("include_inactive", "true");

  return mapBrandRiskResponse(
    await dashboardJSON<BackendDashboardBrandRiskResponse>(`/api/dashboard/domains/${domainID}/brand-risk?${query.toString()}`),
  );
}

export async function getDashboardAlerts(): Promise<DashboardAlert[]> {
  return mapAlertsResponse(await dashboardJSON<BackendDashboardAlertsResponse>("/api/dashboard/alerts"));
}

export async function getDashboardSettings(): Promise<SettingsState> {
  return mapSettingsResponse(await dashboardJSON<BackendDashboardSettingsResponse>("/api/dashboard/settings"));
}

export async function recheckDashboardDomain(domainID: string): Promise<RecheckResult> {
  const payload = await dashboardJSON<BackendDashboardRecheckResponse>(`/api/dashboard/domains/${domainID}/recheck`, {
    method: "POST",
  });
  return {
    jobID: payload.job_id,
    checkID: payload.check_id,
    domainID: payload.domain_id,
    status: payload.status,
    queuedAt: payload.queued_at,
    nextAllowedAt: payload.next_allowed_at,
  };
}

export async function acknowledgeDashboardAlert(alertID: string, reason?: string): Promise<void> {
  await dashboardJSON(`/api/dashboard/alerts/${alertID}/ack`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ reason }),
  });
}

export async function muteDashboardAlert(alertID: string, duration = "7d", reason?: string): Promise<void> {
  await dashboardJSON(`/api/dashboard/alerts/${alertID}/mute`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ duration, reason }),
  });
}

export async function saveDashboardSettings(settings: SettingsState): Promise<SettingsState> {
  return mapSettingsResponse(
    await dashboardJSON<BackendDashboardSettingsResponse>("/api/dashboard/settings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(settingsToBackendPayload(settings)),
    }),
  );
}

export async function fetchReporterCSV(domainID: string, filter?: "unknown"): Promise<Blob> {
  const query = new URLSearchParams({ format: "csv" });
  if (filter) query.set("filter", filter);

  const response = await fetch(`/api/dashboard/domains/${domainID}/reporter?${query.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await responseErrorMessage(response));
  }

  return response.blob();
}

export function emptyDashboardState(notice: string): DashboardInitialState {
  return {
    dashboard: dashboardViewModelFromDomains([], 0, new Date().toISOString()),
    alerts: [],
    settings: {
      alignmentThreshold: 95,
      pauseOnUnknownSpike: false,
      monthlyReports: false,
      notificationChannels: [],
    },
    notice,
  };
}

function dashboardViewModelFromDomains(
  domains: ProtectedDomain[],
  alertCount: number,
  generatedAt?: string,
  overrides?: { protectedDomainCount?: number; averageScore?: number; unknownSenderCount?: number },
): DashboardViewModel {
  const protectedCount = overrides?.protectedDomainCount ?? domains.length;
  const averageScore =
    overrides?.averageScore ?? (domains.length ? domains.reduce((total, domain) => total + domain.score, 0) / domains.length : 0);
  const unknownSenderCount = overrides?.unknownSenderCount ?? domains.reduce((total, domain) => total + domain.unknownSenders, 0);
  const alignmentRate = domains.length
    ? domains.reduce((total, domain) => total + domain.alignmentRate, 0) / domains.length
    : 0;
  const readyForReject = domains.filter((domain) => domain.dmarcPolicy === "quarantine" && domain.score >= 90).length;

  return {
    generatedAt,
    protectedDomains: domains,
    metrics: [
      {
        label: "Protected domains",
        value: `${protectedCount}`,
        detail: `${readyForReject} ready for p=reject`,
        trend: generatedAt ? `Updated ${formatRelativeTime(generatedAt)}` : "Live monitoring data",
        tone: "blue",
        icon: "shield-check",
      },
      {
        label: "Alignment rate",
        value: `${roundOne(alignmentRate)}%`,
        detail: `Average score ${roundOne(averageScore)}`,
        trend: domains.length ? "Across protected domains" : "No domains yet",
        tone: "green",
        icon: "gauge",
      },
      {
        label: "Open alerts",
        value: `${alertCount}`,
        detail: alertCount === 1 ? "1 finding needs review" : `${alertCount} findings need review`,
        trend: alertCount ? "Operator review required" : "No active alerts",
        tone: alertCount ? "amber" : "green",
        icon: "alert-triangle",
      },
      {
        label: "Unknown senders",
        value: `${unknownSenderCount}`,
        detail: "From Reporter inventory",
        trend: unknownSenderCount ? "Needs classification" : "No unknown senders",
        tone: unknownSenderCount ? "red" : "green",
        icon: "shield-alert",
      },
    ],
    recommendations: domains
      .filter((domain) => domain.nextAction)
      .slice(0, 4)
      .map((domain) => ({
        id: domain.id,
        title: domain.nextAction,
        domain: domain.domain,
        impact: `Current score ${domain.score} with ${domain.unknownSenders} unknown sender${domain.unknownSenders === 1 ? "" : "s"}.`,
        effort: domain.score >= 90 ? "Low" : domain.score >= 70 ? "Medium" : "High",
        due: domain.status === "needs-work" ? "Today" : "This week",
      })),
    activityEvents: [
      {
        title: "Dashboard data refreshed",
        detail: `${protectedCount} protected domain${protectedCount === 1 ? "" : "s"} loaded for review.`,
        time: generatedAt ? formatRelativeTime(generatedAt) : "just now",
        icon: "check-circle",
      },
      {
        title: "Reporter inventory summarized",
        detail: `${unknownSenderCount} unknown sender${unknownSenderCount === 1 ? "" : "s"} need review.`,
        time: "live",
        icon: "mail-check",
      },
      {
        title: "Settings available",
        detail: "Automation guardrails are ready for review.",
        time: "live",
        icon: "key",
      },
      {
        title: "DNS change plan updated",
        detail: "Staged records include evidence, risk notes, and rollback guidance.",
        time: "live",
        icon: "database-zap",
      },
    ],
  };
}

async function dashboardJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: init?.headers,
    cache: "no-store",
  });

  if (!response.ok) {
    throw new DashboardRequestError(await responseErrorMessage(response), response.status);
  }

  return (await response.json()) as T;
}

async function responseErrorMessage(response: Response): Promise<string> {
  const payload = (await response.json().catch(() => ({}))) as { error?: string; message?: string };
  return payload.error || payload.message || `Dashboard request failed with ${response.status}.`;
}

function mapDomainStatus(status: string): DomainStatus {
  if (status === "protected" || status === "monitoring" || status === "needs-work") return status;
  return "monitoring";
}

function mapDMARCPolicy(policy: string): ProtectedDomain["dmarcPolicy"] {
  if (policy === "reject" || policy === "quarantine" || policy === "none") return policy;
  return "none";
}

function mapDKIMCoverage(coverage: string): number {
  if (coverage === "covered") return 100;
  return 0;
}

function mapAlertSeverity(severity: string): AlertSeverity {
  if (severity === "critical") return "critical";
  if (severity === "high") return "high";
  if (severity === "warn" || severity === "medium") return "medium";
  return "low";
}

function mapBrandRiskSeverity(severity: string): BrandRiskSeverity {
  if (severity === "Critical" || severity === "High" || severity === "Medium" || severity === "Low" || severity === "Info") {
    return severity;
  }
  const normalized = (severity || "").toLowerCase();
  if (normalized === "critical") return "Critical";
  if (normalized === "high") return "High";
  if (normalized === "medium" || normalized === "warn") return "Medium";
  if (normalized === "low") return "Low";
  return "Info";
}

function spfRouteStatusTone(status: string): SPFRoutePanelModel["statusTone"] {
  const normalized = (status || "").toLowerCase();
  if (normalized === "ready" || normalized === "synced" || normalized === "published" || normalized === "ok") return "green";
  if (normalized === "failed" || normalized === "blocked" || normalized === "error") return "red";
  if (normalized === "syncing" || normalized === "pending" || normalized === "stale") return "amber";
  return "blue";
}

function dnsGuidanceStatusTone(status: string): DNSGuidanceViewModel["statusTone"] {
  const normalized = (status || "").toLowerCase();
  if (normalized === "detected") return "green";
  if (normalized === "ambiguous") return "amber";
  if (normalized === "error" || normalized === "failed") return "red";
  return "amber";
}

function dnsGuidanceStatusLabel(status: string, providerName?: string): string {
  const normalized = (status || "").toLowerCase();
  if (normalized === "detected" && providerName) return `Detected: ${providerName}`;
  if (normalized === "ambiguous") return providerName ? `Ambiguous: ${providerName}` : "Provider ambiguous";
  if (normalized === "unknown") return "Provider unknown";
  return titleCaseStatus(status || "unknown");
}

function titleCaseStatus(status: string): string {
  return (status || "unknown")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatRelativeTime(value?: string): string {
  if (!value) return "not checked";

  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return value;

  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(timestamp));
}

function compactNumber(value: number): string {
  const number = numberOrZero(value);
  if (number >= 1000000) return `${roundOne(number / 1000000)}M`;
  if (number >= 1000) return `${roundOne(number / 1000)}k`;
  return `${number}`;
}

function numberOrZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function roundOne(value: number): number {
  return Math.round(numberOrZero(value) * 10) / 10;
}

function clampThreshold(value: number | undefined): number {
  const threshold = Math.round(numberOrZero(value));
  if (threshold < 1) return 1;
  if (threshold > 100) return 100;
  return threshold;
}
