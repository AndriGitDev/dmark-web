import { NextResponse } from "next/server";
import { adminLockedResponseBody, isAdminOwnerSessionAllowed } from "@/lib/admin-access";
import { adminAPIErrorResponse, adminProxyFetch } from "@/lib/admin-api";

type AdminRouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(request: Request, context: AdminRouteContext) {
  return proxyAdminRequest(request, context, "GET");
}

export async function POST(request: Request, context: AdminRouteContext) {
  return proxyAdminRequest(request, context, "POST");
}

export async function PATCH(request: Request, context: AdminRouteContext) {
  return proxyAdminRequest(request, context, "PATCH");
}

async function proxyAdminRequest(request: Request, context: AdminRouteContext, method: string): Promise<Response> {
  if (!isAdminOwnerSessionAllowed(request.headers)) {
    return NextResponse.json(adminLockedResponseBody(), { status: 403 });
  }

  const body = method === "GET" ? undefined : await request.text();

  try {
    const response = await adminProxyFetch(await backendAdminPath(request, context), {
      method,
      headers: body
        ? {
            "content-type": request.headers.get("content-type") || "application/json",
          }
        : undefined,
      body: body || undefined,
    });
    const contentType = response.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      const payload = await response.json();
      return NextResponse.json(payload, { status: response.status });
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": contentType || "application/octet-stream",
      },
    });
  } catch (error) {
    const { status, body: errorBody } = adminAPIErrorResponse(error);
    return NextResponse.json(errorBody, { status });
  }
}

async function backendAdminPath(request: Request, context: AdminRouteContext): Promise<string> {
  const { path = [] } = await context.params;
  const suffix = path.length ? `/${path.map(encodeURIComponent).join("/")}` : "";
  const requestURL = new URL(request.url);
  return `/api/v1/admin${suffix}${requestURL.search}`;
}
