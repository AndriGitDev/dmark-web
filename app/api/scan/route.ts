import { validateScannableDomain } from "@/lib/scan";
import { mapLookupResponse } from "@/lib/live-scan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const upstreamUrl = "https://lookup.kastro.is/api/lookup";

async function boundedText(body: ReadableStream<Uint8Array> | null, limit: number) {
  if (!body) throw new Error("Missing body");
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > limit) { await reader.cancel(); throw new Error("Response too large"); }
      text += decoder.decode(part.value, {stream: true});
    }
    return text + decoder.decode();
  } finally { reader.releaseLock(); }
}
function reply(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, {status, headers: {"Cache-Control": "no-store", ...headers}});
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      // Next may normalize request.url to localhost behind its internal proxy.
      const incomingHost = request.headers.get("host") ?? new URL(request.url).host;
      if (new URL(origin).host !== incomingHost) return reply({code: "INVALID_REQUEST"}, 403);
    } catch { return reply({code: "INVALID_REQUEST"}, 403); }
  }
  let domain: string;
  try {
    const body = JSON.parse(await boundedText(request.body, 1024));
    if (typeof body?.domain !== "string") return reply({code: "INVALID_DOMAIN"}, 400);
    const validated = validateScannableDomain(body.domain);
    if (validated.error) return reply({code: "INVALID_DOMAIN"}, 400);
    domain = validated.domain;
  } catch { return reply({code: "INVALID_REQUEST"}, 400); }
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const url = new URL(upstreamUrl);
    url.searchParams.set("q", domain);
    const response = await fetch(url, {
      signal: controller.signal, cache: "no-store", redirect: "error",
      headers: {Accept: "application/json"},
    });
    if (response.status === 429) {
      await response.body?.cancel();
      return reply({code: "RATE_LIMITED"}, 429, {"Retry-After": "60"});
    }
    if (!response.ok) { await response.body?.cancel(); return reply({code: "LOOKUP_FAILED"}, 502); }
    const data: unknown = JSON.parse(await boundedText(response.body, 512_000));
    return reply(mapLookupResponse(data, domain, Date.now() - started));
  } catch {
    return reply({code: controller.signal.aborted ? "TIMEOUT" : "LOOKUP_FAILED"}, controller.signal.aborted ? 504 : 502);
  } finally { clearTimeout(timer); }
}
