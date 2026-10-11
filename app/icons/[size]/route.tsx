import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-static";
export function generateStaticParams() { return ["180", "192", "512"].map(size => ({ size })); }
export async function GET(_request: Request, { params }: { params: Promise<{ size: string }> }) {
  const { size: value } = await params;
  if (!["180", "192", "512"].includes(value)) return new Response("Not found", { status: 404 });
  const size = Number(value);
  const star = await readFile(join(process.cwd(), "public/brand/kastro/star-yellow.png"));
  return new ImageResponse(
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#0f0f0d" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${star.toString("base64")}`} width={size * 0.8} height={size * 0.8 * 1688 / 1842} alt="" />
    </div>,
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=86400", "X-Robots-Tag": "noindex" } },
  );
}
