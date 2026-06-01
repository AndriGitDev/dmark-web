import "server-only";

export class AdminAPIError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminAPIError";
    this.status = status;
  }
}

export function adminBackendURL(path: string): URL {
  const base = (process.env.DMARK_APP_API_BASE_URL || process.env.DMARK_API_BASE_URL || "").trim();

  if (!base) {
    throw new AdminAPIError("Admin backend base URL is not configured.", 503);
  }

  try {
    const url = new URL(path, base.endsWith("/") ? base : `${base}/`);
    if (!url.pathname.startsWith("/api/v1/admin")) {
      throw new AdminAPIError("Admin backend path is not allowed.", 500);
    }
    return url;
  } catch (error) {
    if (error instanceof AdminAPIError) throw error;
    throw new AdminAPIError("Admin backend base URL is invalid.", 503);
  }
}

export async function adminProxyFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = String(process.env.DMARK_ADMIN_API_TOKEN || "").trim();

  if (!token) {
    throw new AdminAPIError("Admin backend API token is not configured.", 503);
  }

  const headers = new Headers(init.headers);
  headers.set("accept", headers.get("accept") || "application/json");
  headers.set("authorization", `Bearer ${token}`);

  const timeoutMs = Number(process.env.DMARK_API_TIMEOUT_MS || 10000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) ? timeoutMs : 10000);

  if (init.signal) {
    init.signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(adminBackendURL(path), {
      ...init,
      headers,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new AdminAPIError("Admin backend request timed out.", 504);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export function adminAPIErrorResponse(error: unknown): { status: number; body: { error: string } } {
  if (error instanceof AdminAPIError) {
    return { status: error.status, body: { error: error.message } };
  }

  return { status: 502, body: { error: "Admin backend request failed." } };
}
