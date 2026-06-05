import { NextRequest, NextResponse } from "next/server";
import {
  authentikSessionCookieName,
  authentikStateCookieName,
  getAuthentikConfig,
  isAuthentikUserAllowed,
  signAuthentikSession,
  verifyAuthentikState,
} from "@/lib/authentik-access";

export const dynamic = "force-dynamic";

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
  const config = getAuthentikConfig();
  const adminURL = adminRedirectURL(request);
  if (!config) return redirectWithStatus(adminURL, "authentik-unconfigured");

  const code = request.nextUrl.searchParams.get("code") || "";
  const state = request.nextUrl.searchParams.get("state") || "";
  const stateCookie = request.cookies.get(authentikStateCookieName())?.value || "";
  if (!code || !verifyAuthentikState(stateCookie, state)) {
    return redirectWithStatus(adminURL, "authentik-failed");
  }

  try {
    const token = await exchangeCodeForToken(config.tokenEndpoint, {
      clientID: process.env.DMARK_AUTHENTIK_CLIENT_ID || "",
      clientSecret: process.env.DMARK_AUTHENTIK_CLIENT_SECRET || "",
      code,
      redirectURI: config.redirectURI,
    });
    if (!token.access_token) return redirectWithStatus(adminURL, "authentik-failed");

    const user = await fetchUserInfo(config.userInfoEndpoint, token.access_token);
    if (!isAuthentikUserAllowed(user)) return redirectWithStatus(adminURL, "authentik-forbidden");

    const response = NextResponse.redirect(adminURL, { status: 303 });
    response.cookies.delete(authentikStateCookieName());
    response.cookies.set(authentikSessionCookieName(), signAuthentikSession(user), {
      httpOnly: true,
      maxAge: 8 * 60 * 60,
      path: "/",
      sameSite: "lax",
      secure: true,
    });
    return response;
  } catch {
    return redirectWithStatus(adminURL, "authentik-failed");
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
  if (!response.ok) throw new Error("Authentik token exchange failed");
  return response.json() as Promise<TokenPayload>;
}

async function fetchUserInfo(endpoint: string, accessToken: string): Promise<UserInfoPayload> {
  const response = await fetch(endpoint, {
    headers: { accept: "application/json", authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Authentik userinfo failed");
  return response.json() as Promise<UserInfoPayload>;
}

function redirectWithStatus(url: URL, status: string): Response {
  url.searchParams.set("login", status);
  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.delete(authentikStateCookieName());
  return response;
}

function adminRedirectURL(request: NextRequest): URL {
  return new URL("/admin", request.nextUrl.origin);
}
