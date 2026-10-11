import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { contentForLocale } from "@/lib/public-content";

export const runtime = "nodejs";
export const dynamic = "force-static";
export function generateStaticParams() { return [{ locale: "is" }, { locale: "en" }]; }

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "is" && locale !== "en") return new Response("Not found", { status: 404 });
  const content = contentForLocale(locale);
  const star = await readFile(join(process.cwd(), "public/brand/kastro/star-yellow.png"));
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#0f0f0d", color: "#edeae2", padding: "60px 64px", flexDirection: "column", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #34332e", paddingBottom: 26 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ fontSize: 48, fontWeight: 700, letterSpacing: -2 }}>dmark<span style={{ color: "#f2b705" }}>.</span></span>
          <span style={{ fontSize: 20, color: "#b8b4aa" }}>by Kastro</span>
        </div>
        <span style={{ fontSize: 20, color: "#f2b705" }}>SPF / DKIM / DMARC / BIMI</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: 36 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 750 }}>
          <div style={{ display: "flex", fontSize: 72, fontWeight: 700, letterSpacing: -3, lineHeight: 1.04 }}>{content.shareHeading}</div>
          <div style={{ display: "flex", fontSize: 25, color: "#b8b4aa", lineHeight: 1.4, marginTop: 28 }}>{content.shareDescription}</div>
        </div>
        {/* ImageResponse needs an inline image source; this is the original Kastro asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${star.toString("base64")}`} width={224} height={205} alt="" style={{ objectFit: "contain" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #34332e", paddingTop: 22 }}>
        <span style={{ fontSize: 20 }}>dmark.is</span>
        <span style={{ fontSize: 18, color: "#b8b4aa" }}>{locale === "en" ? "Free to use · No account required" : "Ókeypis · Enginn aðgangur nauðsynlegur"}</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=86400" } },
  );
}
