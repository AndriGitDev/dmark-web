import { NextRequest, NextResponse } from "next/server";
import { dashboardAuthentikSessionCookieName } from "@/lib/dashboard-authentik-access";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Response {
  const url = new URL("/dashboard", request.nextUrl.origin);
  url.searchParams.set("login", "logout");
  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.delete(dashboardAuthentikSessionCookieName());
  return response;
}

export const POST = GET;
