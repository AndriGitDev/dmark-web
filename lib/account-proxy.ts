const sessionCookie = "dmark_account";
const actions = new Set(["me", "start", "finish", "workspace", "logout"]);

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return (
      parsed.origin === origin &&
      parsed.protocol === new URL(request.url).protocol &&
      parsed.host === (request.headers.get("host") || new URL(request.url).host)
    );
  } catch {
    return false;
  }
}

export async function proxyAccount(
  request: Request,
  action: string,
  override?: { method: string; body?: string; csrf?: string },
) {
  if (!actions.has(action))
    return Response.json({ code: "INVALID_REQUEST" }, { status: 404 });
  const method = override?.method ?? request.method;
  if (method !== "GET" && !sameOrigin(request))
    return Response.json({ code: "INVALID_ORIGIN" }, { status: 403 });
  const base = process.env.DMARK_ACCOUNT_API_URL || "https://dmark.kastro.is";
  const url = new URL(`/api/account/${action}`, base);
  if (
    url.protocol !== "https:" &&
    !(
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(url.hostname)
    )
  )
    return Response.json({ code: "ACCOUNT_UNAVAILABLE" }, { status: 503 });
  const cookies = request.headers.get("cookie") || "";
  const token =
    cookies
      .split(";")
      .map((v) => v.trim())
      .find((v) => v.startsWith(sessionCookie + "="))
      ?.slice(sessionCookie.length + 1) ?? "";
  const headers: Record<string, string> = {
    Accept: "application/json",
    Origin: process.env.DMARK_FRONTEND_ORIGIN || "https://dmark.is",
  };
  if (token && /^[A-Za-z0-9_-]{16,256}$/.test(token))
    headers.Cookie = `session=${token}`;
  const csrf = override?.csrf ?? request.headers.get("x-csrf-token");
  if (csrf) headers["X-CSRF-Token"] = csrf;
  let body: string | undefined;
  if (method !== "GET") {
    headers["Content-Type"] = "application/json";
    if (override?.body !== undefined) body = override.body;
    else {
      const reader = request.body?.getReader();
      let bytes = 0;
      const parts: Uint8Array[] = [];
      if (reader)
        try {
          while (true) {
            const item = await reader.read();
            if (item.done) break;
            bytes += item.value.length;
            if (bytes > 16000) {
              await reader.cancel();
              return Response.json(
                { code: "INVALID_REQUEST" },
                { status: 413 },
              );
            }
            parts.push(item.value);
          }
        } finally {
          reader.releaseLock();
        }
      body = Buffer.concat(parts).toString("utf8");
    }
  }
  try {
    const upstream = await fetch(url, {
      method,
      body,
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const reader = upstream.body?.getReader();
    const parts: Uint8Array[] = [];
    let bytes = 0;
    if (reader)
      try {
        while (true) {
          const item = await reader.read();
          if (item.done) break;
          bytes += item.value.length;
          if (bytes > 32000) {
            await reader.cancel();
            throw Error("Response too large");
          }
          parts.push(item.value);
        }
      } finally {
        reader.releaseLock();
      }
    const text = Buffer.concat(parts).toString("utf8");
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw Error("Invalid response");
    }
    const response = Response.json(data, {
      status: upstream.status,
      headers: {
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
    for (const raw of upstream.headers.getSetCookie()) {
      if (!raw.startsWith("session=")) continue;
      const value = raw.split(";")[0].slice(8);
      if (value && !/^[A-Za-z0-9_-]{16,256}$/.test(value)) continue;
      const expired = !value || /Max-Age=0|Max-Age=-1/i.test(raw);
      response.headers.append(
        "Set-Cookie",
        `${sessionCookie}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${expired ? 0 : 86400}${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`,
      );
    }
    return response;
  } catch {
    return Response.json(
      { code: "ACCOUNT_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
