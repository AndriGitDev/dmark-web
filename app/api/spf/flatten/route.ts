import { validateScannableDomain } from "@/lib/scan";
import { FlattenError } from "@/lib/spf-flatten";
import { generateFlattenedSpf } from "@/lib/spf-flatten-dns";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
function reply(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  try {
    if (
      origin &&
      new URL(origin).host !==
        (request.headers.get("host") || new URL(request.url).host)
    )
      return reply({ code: "INVALID_REQUEST" }, 403);
  } catch {
    return reply({ code: "INVALID_REQUEST" }, 403);
  }
  let domain: string;
  try {
    if (!request.body) return reply({ code: "INVALID_REQUEST" }, 400);
    const reader = request.body.getReader();
    let bytes = 0;
    const chunks: Uint8Array[] = [];
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 1024) {
          await reader.cancel();
          return reply({ code: "INVALID_REQUEST" }, 400);
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (typeof body.domain !== "string")
      return reply({ code: "INVALID_DOMAIN" }, 400);
    const valid = validateScannableDomain(body.domain);
    if (valid.error) return reply({ code: "INVALID_DOMAIN" }, 400);
    domain = valid.domain;
  } catch {
    return reply({ code: "INVALID_REQUEST" }, 400);
  }
  try {
    return reply(await generateFlattenedSpf(domain));
  } catch (error) {
    if (error instanceof FlattenError)
      return reply(
        { code: error.code, target: error.target, term: error.term },
        error.code === "DNS_FAILED" ? 502 : 422,
      );
    return reply({ code: "DNS_FAILED" }, 502);
  }
}
