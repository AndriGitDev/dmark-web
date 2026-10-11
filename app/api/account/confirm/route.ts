import { proxyAccount, sameOrigin } from "@/lib/account-proxy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex, nofollow, nosnippet",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy":
    "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
};
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const en = url.searchParams.get("locale") === "en";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token))
    return new Response("Invalid login link", { status: 400, headers });
  const session = await proxyAccount(request, "me", { method: "GET" });
  const data = await session.json();
  if (!session.ok || !/^[A-Za-z0-9_-]{43}$/.test(data.csrf || ""))
    return new Response(
      en
        ? "Account connection unavailable. Return to Dmark and try again."
        : "Ekki náðist samband við aðgangsþjónustu. Farðu aftur í Dmark og reyndu aftur.",
      { status: 503, headers },
    );
  const title = en
    ? "Continue to your Dmark account"
    : "Halda áfram í Dmark aðganginn þinn";
  const response = new Response(
    `<!doctype html><html lang="${en ? "en" : "is"}"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px system-ui;background:#0f0f0d;color:#edeae2;display:grid;place-items:center;min-height:95vh;margin:0;padding:16px;box-sizing:border-box}main{width:100%;max-width:420px;box-sizing:border-box;padding:32px;background:#181815;border:1px solid #edeae23d;border-radius:6px}h1{font-size:25px}p{line-height:1.6}button{padding:14px 22px;border:0;border-radius:4px;background:#f2b705;color:#0f0f0d;font:600 16px system-ui;cursor:pointer}a{color:#f2b705}:focus-visible{outline:2px solid #f2b705;outline-offset:4px}</style></head><body><main><strong>dmark.</strong><h1>${title}</h1><p>${en ? "Open this link in the same browser where you requested it. Continue only if you requested this sign-in." : "Opnaðu hlekkinn í sama vafra og þú notaðir til að biðja um hann. Haltu aðeins áfram ef þú baðst um innskráninguna."}</p><form method="post" action="/api/account/confirm/"><input type="hidden" name="token" value="${token}"><input type="hidden" name="csrf" value="${data.csrf}"><input type="hidden" name="locale" value="${en ? "en" : "is"}"><button type="submit">${en ? "Sign in" : "Skrá inn"}</button></form><p><a href="/${en ? "en" : "is"}/">${en ? "Back to workspace" : "Til baka í vinnusvæði"}</a></p></main></body></html>`,
    { headers: { ...headers, "Content-Type": "text/html; charset=utf-8" } },
  );
  for (const value of session.headers.getSetCookie())
    response.headers.append("Set-Cookie", value);
  return response;
}
export async function POST(request: Request) {
  if (!sameOrigin(request))
    return new Response("Forbidden", { status: 403, headers });
  if (Number(request.headers.get("content-length") || 0) > 4096)
    return new Response("Invalid request", { status: 413, headers });
  const reader = request.body?.getReader();
  const parts: Uint8Array[] = [];
  let bytes = 0;
  if (reader)
    try {
      while (true) {
        const item = await reader.read();
        if (item.done) break;
        bytes += item.value.length;
        if (bytes > 4096) {
          await reader.cancel();
          return new Response("Invalid request", { status: 413, headers });
        }
        parts.push(item.value);
      }
    } finally {
      reader.releaseLock();
    }
  const text = Buffer.concat(parts).toString("utf8");
  const form = new URLSearchParams(text);
  const token = form.get("token") || "";
  const csrf = form.get("csrf") || "";
  const locale = form.get("locale") === "en" ? "en" : "is";
  if (!/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[A-Za-z0-9_-]{43}$/.test(csrf))
    return new Response("Invalid request", { status: 400, headers });
  const upstream = await proxyAccount(request, "finish", {
    method: "POST",
    body: JSON.stringify({ token }),
    csrf,
  });
  const response = new Response(null, {
    status: 303,
    headers: {
      ...headers,
      Location: `/${locale}/?account=${upstream.ok ? "connected" : "link-error"}`,
    },
  });
  for (const value of upstream.headers.getSetCookie())
    response.headers.append("Set-Cookie", value);
  return response;
}
