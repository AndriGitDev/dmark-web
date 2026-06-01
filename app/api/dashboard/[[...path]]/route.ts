import { NextResponse } from "next/server";
import { dashboardLockedResponseBody, isDashboardAccessEnabled } from "@/lib/dashboard-access";
import {
  dashboardAPIErrorResponse,
  dashboardProxyFetch,
  shouldUseDashboardMock,
} from "@/lib/dashboard-api";
import {
  mockChangePlan,
  mockBrandRiskView,
  mockDashboardAlerts,
  mockDashboardViewModel,
  mockReporterView,
  mockSettings,
  settingsToBackendPayload,
  type DashboardAlert,
} from "@/lib/dashboard";

type DashboardRouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(request: Request, context: DashboardRouteContext) {
  if (!isDashboardAccessEnabled()) {
    return dashboardLockedResponse();
  }

  const backendPath = await backendDashboardPath(request, context);

  if (shouldUseDashboardMock()) {
    return mockGET(backendPath);
  }

  return proxyDashboard(backendPath, { method: "GET" });
}

export async function POST(request: Request, context: DashboardRouteContext) {
  if (!isDashboardAccessEnabled()) {
    return dashboardLockedResponse();
  }

  const backendPath = await backendDashboardPath(request, context);
  const body = await request.text();

  if (shouldUseDashboardMock()) {
    return mockPOST(backendPath, body);
  }

  return proxyDashboard(backendPath, {
    method: "POST",
    headers: {
      "content-type": request.headers.get("content-type") || "application/json",
    },
    body: body || undefined,
  });
}

function dashboardLockedResponse(): Response {
  return NextResponse.json(dashboardLockedResponseBody(), { status: 403 });
}

async function backendDashboardPath(request: Request, context: DashboardRouteContext): Promise<string> {
  const { path = [] } = await context.params;
  const suffix = path.length ? `/${path.map(encodeURIComponent).join("/")}` : "";
  const requestURL = new URL(request.url);
  return `/api/v1/dashboard${suffix}${requestURL.search}`;
}

async function proxyDashboard(path: string, init: RequestInit): Promise<Response> {
  try {
    const response = await dashboardProxyFetch(path, init);
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("text/csv")) {
      return new Response(response.body, {
        status: response.status,
        headers: {
          "content-type": "text/csv",
          ...(response.headers.get("content-disposition")
            ? { "content-disposition": response.headers.get("content-disposition") as string }
            : {}),
        },
      });
    }

    const payload = await response.json();
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const { status, body } = dashboardAPIErrorResponse(error);
    return NextResponse.json(body, { status });
  }
}

function mockGET(path: string): Response {
  const url = new URL(path, "http://mock.local");
  const parts = url.pathname.split("/").filter(Boolean);
  const tail = parts.slice(3);

  if (tail.length === 0) {
    return NextResponse.json({
      generated_at: mockDashboardViewModel.generatedAt || new Date().toISOString(),
      protected_domain_count: mockDashboardViewModel.protectedDomains.length,
      average_score: 81.3,
      alert_count: mockDashboardAlerts.length,
      unknown_sender_count: mockDashboardViewModel.protectedDomains.reduce((total, domain) => total + domain.unknownSenders, 0),
      domains: mockDashboardViewModel.protectedDomains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        last_checked_at: new Date().toISOString(),
        status: domain.status,
        score: domain.score,
        dmarc_policy: domain.dmarcPolicy,
        spf_lookup_count: domain.spfLookups,
        dkim_coverage: domain.dkimCoverage === 100 ? "covered" : "missing",
        alignment_rate: domain.alignmentRate,
        unknown_sender_count: domain.unknownSenders,
        next_action: domain.nextAction,
      })),
    });
  }

  if (tail[0] === "domains" && tail.length === 1) {
    return NextResponse.json({
      domains: mockDashboardViewModel.protectedDomains.map((domain) => ({
        id: domain.id,
        domain: domain.domain,
        last_checked_at: new Date().toISOString(),
        status: domain.status,
        score: domain.score,
        dmarc_policy: domain.dmarcPolicy,
        spf_lookup_count: domain.spfLookups,
        dkim_coverage: domain.dkimCoverage === 100 ? "covered" : "missing",
        alignment_rate: domain.alignmentRate,
        unknown_sender_count: domain.unknownSenders,
        next_action: domain.nextAction,
      })),
    });
  }

  if (tail[0] === "domains" && tail.length === 2) {
    const domain = mockDashboardViewModel.protectedDomains.find((item) => item.id === tail[1]);

    if (!domain) {
      return NextResponse.json({ error: "domain was not found" }, { status: 404 });
    }

    return NextResponse.json({
      domain: {
        id: domain.id,
        domain: domain.domain,
        last_checked_at: new Date().toISOString(),
        status: domain.status,
        score: domain.score,
        dmarc_policy: domain.dmarcPolicy,
        spf_lookup_count: domain.spfLookups,
        dkim_coverage: domain.dkimCoverage === 100 ? "covered" : "missing",
        alignment_rate: domain.alignmentRate,
        unknown_sender_count: domain.unknownSenders,
        next_action: domain.nextAction,
      },
      history: [],
    });
  }

  if (tail[0] === "domains" && tail[2] === "change-plan") {
    const domain = mockDashboardViewModel.protectedDomains.find((item) => item.id === tail[1]);
    const domainName = domain?.domain || mockChangePlan.domain;
    const dnsSafeName = domainName.replaceAll(".", "-");
    return NextResponse.json({
      domain_id: tail[1],
      domain: domainName,
      generated_at: new Date().toISOString(),
      journey_state: mockChangePlan.journeyState,
      next_action: mockChangePlan.nextAction,
      changes: mockChangePlan.changes.map((change) => ({
        id: change.id,
        title: change.title,
        status: change.state,
        record_name: change.recordName?.replaceAll("northwind.is", domainName).replaceAll("northwind-is", dnsSafeName),
        record_type: change.recordType,
        record_text: change.recordText.replaceAll("northwind.is", domainName).replaceAll("northwind-is", dnsSafeName),
        evidence: change.evidence,
        risk: change.risk,
        rollback_note: change.rollbackNote,
      })),
    });
  }

  if (tail[0] === "domains" && tail[2] === "spf-route") {
    const domain = mockDashboardViewModel.protectedDomains.find((item) => item.id === tail[1]);
    const domainName = domain?.domain || "example.is";
    const dnsSafeName = domainName.replaceAll(".", "-");
    return NextResponse.json({
      id: `mock-spf-route-${tail[1]}`,
      domain_id: tail[1],
      domain: domainName,
      status: domain?.spfLookups && domain.spfLookups > 10 ? "stale" : "ready",
      route_fqdn: `${dnsSafeName}.route.dmark.is`,
      customer_cname_name: `_spf.${domainName}`,
      customer_cname_target: `${dnsSafeName}.route.dmark.is`,
      generated_spf_preview: `v=spf1 include:${dnsSafeName}.route.dmark.is ~all`,
      last_published_spf: `v=spf1 include:${dnsSafeName}.route.dmark.is ~all`,
      last_synced_at: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      enabled_sources: [
        { kind: "include", value: "spf.protection.outlook.com", label: "Microsoft 365" },
        { kind: "include", value: "_spf.google.com", label: "Google Workspace" },
      ],
      evidence_summary: [
        {
          source_value: "spf.protection.outlook.com",
          resolved_domain: "spf.protection.outlook.com",
          mechanism: "include:spf.protection.outlook.com",
          kind: "include",
          message: "Mock evidence only; no Bunny DNS mutation performed.",
        },
      ],
    });
  }

  if (tail[0] === "domains" && tail[2] === "brand-risk") {
    const domain = mockDashboardViewModel.protectedDomains.find((item) => item.id === tail[1]);
    const includeInactive = url.searchParams.get("include_inactive") === "true";
    const domainName = domain?.domain || mockBrandRiskView.domain;
    const lookalikes = includeInactive
      ? mockBrandRiskView.lookalikes
      : mockBrandRiskView.lookalikes.filter((candidate) => candidate.activeEvidence);

    return NextResponse.json({
      domain_id: tail[1],
      domain: domainName,
      generated_at: new Date().toISOString(),
      findings: mockBrandRiskView.findings.map((finding) => ({
        category: finding.category,
        type: finding.type,
        title: finding.title,
        severity: finding.severity,
        evidence: finding.evidence,
        recommended_action: finding.recommendedAction,
      })),
      lookalikes: lookalikes.map((candidate) => ({
        domain: candidate.domain.replaceAll(mockBrandRiskView.domain, domainName),
        kind: candidate.kind,
        reason: candidate.reason,
        has_address_records: candidate.hasAddressRecords,
        has_mx_records: candidate.hasMXRecords,
        severity: candidate.severity,
        evidence: candidate.evidence,
        recommended_action: candidate.recommendedAction,
      })),
    });
  }

  if (tail[0] === "domains" && tail[2] === "reporter") {
    if (url.searchParams.get("format") === "csv") {
      const rows = [
        ["provider", "volume", "aligned_percentage", "classification", "trend"],
        ...mockReporterView.senderSources.map((source) => [
          source.provider,
          `${source.volumeCount}`,
          `${source.aligned}`,
          source.unknown ? "unknown" : "expected",
          source.trend,
        ]),
      ];
      return new Response(rows.map((row) => row.join(",")).join("\n"), {
        headers: {
          "content-type": "text/csv",
          "content-disposition": `attachment; filename="dmark-reporter-senders.csv"`,
        },
      });
    }

    const unknownOnly = url.searchParams.get("filter") === "unknown";
    const senders = unknownOnly
      ? mockReporterView.senderSources.filter((source) => source.unknown)
      : mockReporterView.senderSources;
    const domain = mockDashboardViewModel.protectedDomains.find((item) => item.id === tail[1]);
    return NextResponse.json({
      domain_id: tail[1],
      domain: domain?.domain || mockReporterView.domain,
      report_volume: 1400000,
      aligned_percentage: mockReporterView.alignedPercentage,
      reporter_org_count: mockReporterView.reporterOrgCount,
      failures: 64000,
      reject_candidates: mockReporterView.rejectCandidates,
      sender_inventory: senders.map((source) => ({
        source_ip: source.sourceIP,
        provider: source.provider,
        volume: source.volumeCount,
        aligned_percentage: source.aligned,
        classification: source.unknown ? "unknown" : "expected",
        trend: source.trend,
      })),
    });
  }

  if (tail[0] === "alerts") {
    return NextResponse.json({ alerts: mockDashboardAlerts.map(alertToBackend) });
  }

  if (tail[0] === "settings") {
    return NextResponse.json(settingsToBackendPayload(mockSettings));
  }

  return NextResponse.json({ error: "Mock dashboard route not found." }, { status: 404 });
}

function mockPOST(path: string, body: string): Response {
  const url = new URL(path, "http://mock.local");
  const parts = url.pathname.split("/").filter(Boolean);
  const tail = parts.slice(3);

  if (tail[0] === "domains" && tail[2] === "recheck") {
    return NextResponse.json(
      {
        job_id: "mock-job",
        domain_id: tail[1],
        status: "queued",
        queued_at: new Date().toISOString(),
        next_allowed_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
      { status: 202 },
    );
  }

  if (tail[0] === "domains" && tail[2] === "spf-route" && tail[3] === "sync") {
    return NextResponse.json(
      {
        job_id: "mock-spf-route-sync",
        domain_id: tail[1],
        status: "queued",
        queued_at: new Date().toISOString(),
      },
      { status: 202 },
    );
  }

  if (tail[0] === "alerts" && (tail[2] === "ack" || tail[2] === "mute")) {
    return NextResponse.json({
      id: tail[1],
      status: tail[2] === "ack" ? "acknowledged" : "muted",
      applied_at: new Date().toISOString(),
    });
  }

  if (tail[0] === "settings") {
    const payload = JSON.parse(body || "{}");
    return NextResponse.json({ ...settingsToBackendPayload(mockSettings), ...payload, updated_at: new Date().toISOString() });
  }

  return NextResponse.json({ error: "Mock dashboard route not found." }, { status: 404 });
}

function alertToBackend(alert: DashboardAlert) {
  return {
    id: alert.id,
    domain: alert.domain,
    severity: alert.severity === "medium" ? "warn" : alert.severity,
    message: alert.title,
    evidence: alert.detail,
    created_at: new Date().toISOString(),
  };
}
