import { createHmac, timingSafeEqual } from "node:crypto";

const OPEN_VALUES = new Set(["1", "true", "yes", "open"]);
const ADMIN_TEMP_COOKIE = "dmark_admin_temp_session";

export function isAdminAccessEnabled(): boolean {
  return OPEN_VALUES.has(String(process.env.DMARK_ADMIN_ACCESS || "").trim().toLowerCase());
}

export function isAdminTempPasswordEnabled(): boolean {
  return String(process.env.DMARK_ADMIN_TEMP_PASSWORD || "").trim().length > 0;
}

export function adminTempCookieName(): string {
  return ADMIN_TEMP_COOKIE;
}

export function signAdminTempPassword(password: string): string {
  const expectedPassword = String(process.env.DMARK_ADMIN_TEMP_PASSWORD || "").trim();
  const providedPassword = String(password || "").trim();
  const signingSecret = String(process.env.DMARK_ADMIN_OWNER_SESSION_SECRET || expectedPassword).trim();

  if (!expectedPassword || !providedPassword || providedPassword !== expectedPassword || !signingSecret) {
    return "";
  }

  return createHmac("sha256", signingSecret).update(`dmark-admin-temp:${expectedPassword}`).digest("base64url");
}

export function isAdminOwnerSessionAllowed(headers: Headers): boolean {
  if (!isAdminAccessEnabled()) {
    return false;
  }

  const expected = String(process.env.DMARK_ADMIN_OWNER_SESSION_SECRET || "").trim();
  const provided = String(headers.get("x-dmark-owner-session") || "").trim();

  if (expected && provided && timingSafeMatch(expected, provided)) {
    return true;
  }

  const tempPassword = String(process.env.DMARK_ADMIN_TEMP_PASSWORD || "").trim();
  const tempCookie = cookieValue(headers.get("cookie") || "", ADMIN_TEMP_COOKIE);
  const expectedCookie = signAdminTempPassword(tempPassword);

  return Boolean(expectedCookie && tempCookie && timingSafeMatch(expectedCookie, tempCookie));
}

export function adminLockedResponseBody() {
  return {
    error: "Admin control plane access is closed.",
  };
}

function timingSafeMatch(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

function cookieValue(cookieHeader: string, name: string): string {
  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || "";
}
