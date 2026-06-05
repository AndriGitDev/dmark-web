import { timingSafeEqual } from "node:crypto";
import { isAuthentikSessionAllowed } from "./authentik-access";

const OPEN_VALUES = new Set(["1", "true", "yes", "open"]);

export function isAdminAccessEnabled(): boolean {
  return OPEN_VALUES.has(String(process.env.DMARK_ADMIN_ACCESS || "").trim().toLowerCase());
}

export function isAdminOwnerSessionAllowed(headers: Headers): boolean {
  if (isAuthentikSessionAllowed(headers)) {
    return true;
  }

  if (!isAdminAccessEnabled()) {
    return false;
  }

  const expected = String(process.env.DMARK_ADMIN_OWNER_SESSION_SECRET || "").trim();
  const provided = String(headers.get("x-dmark-owner-session") || "").trim();

  return Boolean(expected && provided && timingSafeMatch(expected, provided));
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
