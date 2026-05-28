import { NextResponse } from "next/server";
import { backendErrorMessage, backendURL, mapScanResponse, shouldUseMockBackend } from "@/lib/backend";
import { mockScan, normalizeDomain } from "@/lib/scan";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { domain?: string };
  const domain = normalizeDomain(body.domain || "");

  if (!domain) {
    return NextResponse.json({ error: "Domain is required." }, { status: 400 });
  }

  const url = backendURL(process.env.DMARK_SCAN_API_URL);

  if (!url || shouldUseMockBackend()) {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return NextResponse.json(mockScan(domain));
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      ...(process.env.DMARK_API_TOKEN
        ? { authorization: `Bearer ${process.env.DMARK_API_TOKEN}` }
        : {}),
    },
    body: JSON.stringify({ domain }),
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    const message = await backendErrorMessage(response, "Scan service unavailable.");
    return NextResponse.json({ error: message }, { status: response.status >= 500 ? 502 : response.status });
  }

  const payload = await response.json();
  return NextResponse.json(mapScanResponse(payload, domain));
}
