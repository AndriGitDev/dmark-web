import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  buildDashboardAuthentikAuthorizeURL,
  dashboardAuthentikStateCookieName,
  getDashboardAuthentikConfig,
  signDashboardAuthentikState,
} from "@/lib/dashboard-authentik-access";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const config = getDashboardAuthentikConfig();
  const fallback = new URL("/dashboard", process.env.DMARK_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "https://dmark.is");

  if (!config) {
    fallback.searchParams.set("login", "authentik-unconfigured");
    return NextResponse.redirect(fallback, { status: 303 });
  }

  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildDashboardAuthentikAuthorizeURL(state, nonce), { status: 303 });
  response.cookies.set(dashboardAuthentikStateCookieName(), signDashboardAuthentikState(state), {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/dashboard/auth/callback",
    sameSite: "lax",
    secure: true,
  });
  return response;
}
