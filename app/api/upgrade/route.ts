import { NextResponse } from "next/server";
import {
  auditClaimsURL,
  backendErrorMessage,
  mapAuditResponse,
  shouldUseMockBackend,
  type BackendAuditClaimResponse,
} from "@/lib/backend";
import { normalizeDomain, type UpgradePayload, type UpgradeResponse } from "@/lib/scan";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<UpgradePayload>;
  const payload: UpgradePayload = {
    name: (body.name || "").trim(),
    domain: normalizeDomain(body.domain || ""),
    email: (body.email || "").trim().toLowerCase(),
    plan: body.plan === "managed" ? "managed" : "saas",
  };

  if (!payload.name || !payload.domain || !isValidEmail(payload.email)) {
    return NextResponse.json({ error: "Name, domain, and contact email are required." }, { status: 400 });
  }

  const auditURL = auditClaimsURL();
  let claimResponse: BackendAuditClaimResponse | undefined;

  if (auditURL && !shouldUseMockBackend()) {
    const response = await fetch(auditURL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        domain: payload.domain,
        email: payload.email,
      }),
      next: { revalidate: 0 },
    });

    claimResponse = (await response.json().catch(() => ({}))) as BackendAuditClaimResponse;

    if (!response.ok) {
      const message = claimResponse.error || (await backendErrorMessage(response, "Audit claim could not be submitted."));
      return NextResponse.json(
        { error: message, audit: mapAuditResponse(claimResponse.audit) },
        { status: response.status >= 500 ? 502 : response.status },
      );
    }
  }

  if (process.env.NOCODB_WEBHOOK_URL) {
    const response = await fetch(process.env.NOCODB_WEBHOOK_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...payload,
        source: "dmark.is",
        requestedAt: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Upgrade request could not be submitted." }, { status: 502 });
    }
  }

  const responsePayload: UpgradeResponse = {
    ok: true,
    claimId: claimResponse?.claim_id,
    claimStatus: claimResponse?.status,
    audit: mapAuditResponse(claimResponse?.audit),
  };

  return NextResponse.json(responsePayload);
}
