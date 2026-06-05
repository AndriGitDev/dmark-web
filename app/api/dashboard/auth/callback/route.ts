import { NextRequest, NextResponse } from "next/server";
import {
  dashboardAuthentikSessionCookieName,
  dashboardAuthentikStateCookieName,
  getDashboardAuthentikConfig,
  isDashboardAuthentikUserAllowed,
  signDashboardAuthentikSession,
  verifyDashboardAuthentikState,
} from "@/lib/dashboard-authentik-access";

export const dynamic = "force-dynamic";

const DEFAULT_PUBLIC_ORIGIN = "https://dmark.is";

type TokenPayload = {
  access_token?: string;
  token_type?: string;
};

type UserInfoPayload = {
  email?: string;
  name?: string;
  groups?: string[];
};

export async function GET(request: NextRequest): Promise<Response> {
  const config = getDashboardAuthentikConfig();
  const dashboardURL = dashboardRedirectURL(request);
  if (!config) return redirectWithStatus(dashboardURL, "authentik-unconfigured");

  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const stateCookie = request.cookies.get(dashboardAuthentikStateCookieName())?.value || "";
  if (!code || !verifyDashboardAuthentikState(stateCookie, state)) {
    return redirectWithStatus(dashboardURL, "authentik-failed");
  }

  try {
    const token = await exchangeCodeForToken(config.tokenEndpoint, {
      clientID: process.env.DMARK_DASHBOARD_AUTHENTIK_CLIENT_ID || "",
      clientSecret: process.env.DMARK_DASHBOARD_AUTHENTIK_CLIENT_SECRET || "",
      code,
      redirectURI: config.redirectURI,
    });
    if (!token.access_token) return redirectWithStatus(dashboardURL, "authentik-failed");

    const user = await fetchUserInfo(config.userInfoEndpoint, token.access_token);
    if (!isDashboardAuthentikUserAllowed(user)) return redirectWithStatus(dashboardURL, "authentik-forbidden");

    const response = NextResponse.redirect(dashboardURL, { status: 303 });
    response.cookies.delete(dashboardAuthentikStateCookieName());
    response.cookies.set(dashboardAuthentikSessionCookieName(), signDashboardAuthentikSession(user), {
      httpOnly: true,
      maxAge: 8 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    return response;
  } catch {
    return redirectWithStatus(dashboardURL, "authentik-failed");
  }
}

async function exchangeCodeForToken(endpoint: string, params: { clientID: string; clientSecret: string; code: string; redirectURI: string }): Promise<TokenPayload> {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: params.code,
      redirect_uri: params.redirectURI,
      client_id: params.clientID,
      client_secret: params.clientSecret,
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Dashboard Authentik token exchange failed");
  return response.json() as Promise<TokenPayload>;
}

async function fetchUserInfo(endpoint: string, accessToken: string): Promise<UserInfoPayload> {
  const response = await fetch(endpoint, {
    headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Dashboard Authentik userinfo failed");
  return response.json() as Promise<UserInfoPayload>;
}

function redirectWithStatus(url: URL, status: string): Response {
  url.searchParams.set("login", status);
  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.delete(dashboardAuthentikStateCookieName());
  return response;
}

function dashboardRedirectURL(request: NextRequest): URL {
  const configuredOrigin = firstForwardedValue(process.env.DMARK_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "");
  if (configuredOrigin) {
    return new URL("/dashboard", configuredOrigin);
  }

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host")) || firstForwardedValue(request.headers.get("host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto")) || "https";

  if (forwardedHost && !isLocalhostHost(forwardedHost)) {
    return new URL("/dashboard", `${forwardedProto}://${forwardedHost}`);
  }

  return new URL("/dashboard", DEFAULT_PUBLIC_ORIGIN);
}

function firstForwardedValue(value: string | null): string {
  return String(value || "").split(",")[0]?.trim() || "";
}

function isLocalhostHost(host: string): boolean {
  return host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
}
