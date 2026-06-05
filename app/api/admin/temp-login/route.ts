import { NextResponse } from "next/server";
import { adminTempCookieName, isAdminAccessEnabled, signAdminTempPassword } from "@/lib/admin-access";

const DEFAULT_PUBLIC_ORIGIN = "https://dmark.is";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  const token = signAdminTempPassword(password);
  const url = adminRedirectURL(request);

  if (!token) {
    url.searchParams.set("login", "failed");
    return NextResponse.redirect(url, { status: 303 });
  }

  if (!isAdminAccessEnabled()) {
    url.searchParams.set("login", "closed");
    return NextResponse.redirect(url, { status: 303 });
  }

  const response = NextResponse.redirect(url, { status: 303 });
  response.cookies.set(adminTempCookieName(), token, {
    httpOnly: true,
    maxAge: 15 * 60,
    path: "/",
    sameSite: "strict",
    secure: true,
  });
  return response;
}

function adminRedirectURL(request: Request): URL {
  const configuredOrigin = firstForwardedValue(process.env.DMARK_PUBLIC_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || "");
  if (configuredOrigin) {
    return new URL("/admin", configuredOrigin);
  }

  const forwardedHost = firstForwardedValue(request.headers.get("x-forwarded-host")) || firstForwardedValue(request.headers.get("host"));
  const forwardedProto = firstForwardedValue(request.headers.get("x-forwarded-proto")) || "https";

  if (forwardedHost && !isLocalhostHost(forwardedHost)) {
    return new URL("/admin", `${forwardedProto}://${forwardedHost}`);
  }

  return new URL("/admin", DEFAULT_PUBLIC_ORIGIN);
}

function firstForwardedValue(value: string | null): string {
  return String(value || "").split(",")[0]?.trim() || "";
}

function isLocalhostHost(host: string): boolean {
  return host === "localhost" || host.startsWith("localhost:") || host === "127.0.0.1" || host.startsWith("127.0.0.1:");
}
