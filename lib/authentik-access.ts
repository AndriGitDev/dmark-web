import { createHmac, timingSafeEqual } from "node:crypto";

const AUTHENTIK_SESSION_COOKIE = "dmark_authentik_session";
const AUTHENTIK_STATE_COOKIE = "dmark_authentik_state";
const DEFAULT_SESSION_TTL_SECONDS = 8 * 60 * 60;

type AuthentikConfig = {
  issuer: string;
  clientID: string;
  redirectURI: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userInfoEndpoint: string;
};

type AuthentikUser = {
  email?: string;
  name?: string;
  groups?: string[];
};

type AuthentikSession = {
  email: string;
  name: string;
  groups: string[];
  exp: number;
};

export function authentikSessionCookieName(): string {
  return AUTHENTIK_SESSION_COOKIE;
}

export function authentikStateCookieName(): string {
  return AUTHENTIK_STATE_COOKIE;
}

export function isAuthentikOIDCEnabled(): boolean {
  return getAuthentikConfig() !== null;
}

export function getAuthentikConfig(): AuthentikConfig | null {
  const issuer = normalizeIssuer(process.env.DMARK_AUTHENTIK_ISSUER);
  const clientID = String(process.env.DMARK_AUTHENTIK_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.DMARK_AUTHENTIK_CLIENT_SECRET || "").trim();
  const redirectURI = String(process.env.DMARK_AUTHENTIK_REDIRECT_URI || "").trim();
  const sessionSecret = String(process.env.DMARK_AUTHENTIK_SESSION_SECRET || "").trim();

  if (!issuer || !clientID || !clientSecret || !redirectURI || !sessionSecret) {
    return null;
  }

  return {
    issuer,
    clientID,
    redirectURI,
    authorizationEndpoint: new URL("authorize/", issuer).toString(),
    tokenEndpoint: new URL("token/", issuer).toString(),
    userInfoEndpoint: new URL("userinfo/", issuer).toString(),
  };
}

export function buildAuthentikAuthorizeURL(state: string, nonce: string): string {
  const config = getAuthentikConfig();
  if (!config) return "";

  const url = new URL(config.authorizationEndpoint);
  url.searchParams.set("client_id", config.clientID);
  url.searchParams.set("redirect_uri", config.redirectURI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url.toString();
}

export function isAuthentikUserAllowed(user: AuthentikUser): boolean {
  const email = String(user.email || "").trim().toLowerCase();
  const groups = new Set((user.groups || []).map((group) => String(group || "").trim().toLowerCase()).filter(Boolean));
  const allowedEmails = envList("DMARK_AUTHENTIK_ALLOWED_EMAILS").map((item) => item.toLowerCase());
  const allowedGroups = envList("DMARK_AUTHENTIK_ALLOWED_GROUPS").map((item) => item.toLowerCase());

  if (!allowedEmails.length && !allowedGroups.length) return false;
  if (email && allowedEmails.includes(email)) return true;
  return allowedGroups.some((group) => groups.has(group));
}

export function signAuthentikSession(user: AuthentikUser, expiresAt = nowSeconds() + DEFAULT_SESSION_TTL_SECONDS): string {
  const secret = String(process.env.DMARK_AUTHENTIK_SESSION_SECRET || "").trim();
  const email = String(user.email || "").trim().toLowerCase();
  if (!secret || !email) return "";

  const payload: AuthentikSession = {
    email,
    name: String(user.name || email).trim(),
    groups: (user.groups || []).map((group) => String(group || "").trim()).filter(Boolean),
    exp: expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyAuthentikSession(cookieValue: string, now = nowSeconds()): AuthentikSession | null {
  const secret = String(process.env.DMARK_AUTHENTIK_SESSION_SECRET || "").trim();
  const [encodedPayload, signature, extra] = String(cookieValue || "").split(".");
  if (!secret || !encodedPayload || !signature || extra) return null;
  if (!timingSafeMatch(signValue(encodedPayload, secret), signature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as AuthentikSession;
    if (!payload.email || !payload.exp || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

export function isAuthentikSessionAllowed(headers: Headers): boolean {
  if (!isAuthentikOIDCEnabled()) return false;
  const session = verifyAuthentikSession(cookieValue(headers.get("cookie") || "", AUTHENTIK_SESSION_COOKIE));
  if (!session) return false;
  return isAuthentikUserAllowed(session);
}

export function signAuthentikState(state: string): string {
  const secret = String(process.env.DMARK_AUTHENTIK_SESSION_SECRET || "").trim();
  const value = String(state || "").trim();
  if (!secret || !value) return "";
  return `${value}.${signValue(value, secret)}`;
}

export function verifyAuthentikState(cookieValue: string, state: string): boolean {
  const secret = String(process.env.DMARK_AUTHENTIK_SESSION_SECRET || "").trim();
  const [cookieState, signature, extra] = String(cookieValue || "").split(".");
  const expectedState = String(state || "").trim();
  if (!secret || !cookieState || !signature || extra || !expectedState) return false;
  return timingSafeMatch(cookieState, expectedState) && timingSafeMatch(signValue(cookieState, secret), signature);
}

function normalizeIssuer(value: string | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    const url = new URL(raw.endsWith("/") ? raw : `${raw}/`);
    if (url.protocol !== "https:" && !url.hostname.endsWith(".test")) return "";
    return url.toString();
  } catch {
    return "";
  }
}

function envList(key: string): string[] {
  return String(process.env[key] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function signValue(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
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

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}
