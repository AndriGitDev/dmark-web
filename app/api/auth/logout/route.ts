import { NextRequest, NextResponse } from "next/server";
import { authentikSessionCookieName } from "@/lib/authentik-access";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest): Response {
  const url = new URL("/admin", request.nextUrl.origin);
  url.searchParams.set("login", "logout");
  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.delete(authentikSessionCookieName());
  return response;
}

export const POST = GET;
