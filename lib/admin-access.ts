import { timingSafeEqual } from "node:crypto";

const OPEN_VALUES = new Set(["1", "true", "yes", "open"]);

export function isAdminAccessEnabled(): boolean {
  return OPEN_VALUES.has(String(process.env.DMARK_ADMIN_ACCESS || "").trim().toLowerCase());
}

export function isAdminOwnerSessionAllowed(headers: Headers): boolean {
  if (!isAdminAccessEnabled()) {
    return false;
  }

  const expected = String(process.env.DMARK_ADMIN_OWNER_SESSION_SECRET || "").trim();
  const provided = String(headers.get("x-dmark-owner-session") || "").trim();

  if (!expected || !provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

export function adminLockedResponseBody() {
  return {
    error: "Admin control plane access is closed.",
  };
}
