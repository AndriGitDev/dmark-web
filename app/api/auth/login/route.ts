import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import {
  authentikNonceCookieName,
  authentikStateCookieName,
  buildAuthentikAuthorizeURL,
  getAuthentikConfig,
  signAuthentikNonce,
  signAuthentikState,
} from "@/lib/authentik-access";

export const dynamic = "force-dynamic";

export function GET(): Response {
  const config = getAuthentikConfig();
  const fallback = new URL("/admin", process.env.DMARK_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "https://dmark.is");

  if (!config) {
    fallback.searchParams.set("login", "authentik-unconfigured");
    return NextResponse.redirect(fallback, { status: 303 });
  }

  const state = randomBytes(24).toString("base64url");
  const nonce = randomBytes(24).toString("base64url");
  const response = NextResponse.redirect(buildAuthentikAuthorizeURL(state, nonce), { status: 303 });
  response.cookies.set(authentikStateCookieName(), signAuthentikState(state), {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/auth/callback",
    sameSite: "lax",
    secure: true,
  });
  response.cookies.set(authentikNonceCookieName(), signAuthentikNonce(nonce), {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/auth/callback",
    sameSite: "lax",
    secure: true,
  });
  return response;
}
