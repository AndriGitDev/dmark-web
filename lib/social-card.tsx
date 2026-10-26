import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

type Card = { locale: "is" | "en"; eyebrow: string; heading: string; sub: string; footer: string; showVerdict?: boolean };

/** One 1200x630 template for every share image so they read as one brand. */
export async function socialCard({ locale, eyebrow, heading, sub, footer, showVerdict }: Card) {
  const star = await readFile(join(process.cwd(), "public/brand/kastro/star-yellow.png"));
  const pill = (label: string, color: string) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 22px", border: `2px solid ${color}`, borderRadius: 999, color, fontSize: 26 }}>
      <div style={{ width: 14, height: 14, borderRadius: 999, background: color }} />
      {label}
    </div>
  );
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#0f0f0d", color: "#edeae2", padding: "56px 64px", flexDirection: "column", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: -2 }}>dmark<span style={{ color: "#f2b705" }}>.</span></span>
          <span style={{ fontSize: 20, color: "#b8b4aa" }}>by Kastro</span>
        </div>
        <span style={{ fontSize: 20, color: "#f2b705", textTransform: "uppercase", letterSpacing: 2 }}>{eyebrow}</span>
      </div>
      <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "space-between", gap: 32 }}>
        <div style={{ display: "flex", flexDirection: "column", width: 820 }}>
          <div style={{ display: "flex", fontSize: heading.length > 34 ? 60 : 76, fontWeight: 700, letterSpacing: -2, lineHeight: 1.04 }}>{heading}</div>
          <div style={{ display: "flex", fontSize: 27, color: "#b8b4aa", lineHeight: 1.4, marginTop: 24 }}>{sub}</div>
          {showVerdict ? (
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 34 }}>
              {pill(locale === "en" ? "Not protected" : "Óvarið", "#ff8178")}
              <span style={{ fontSize: 30, color: "#9a968c" }}>→</span>
              {pill(locale === "en" ? "Protected" : "Varið", "#88c599")}
            </div>
          ) : null}
        </div>
        {/* ImageResponse needs an inline image source; this is the original Kastro asset. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${star.toString("base64")}`} width={200} height={183} alt="" style={{ objectFit: "contain" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #34332e", paddingTop: 22 }}>
        <span style={{ fontSize: 22 }}>{footer}</span>
        <span style={{ fontSize: 20, color: "#b8b4aa" }}>{locale === "en" ? "Free · No account · No email" : "Ókeypis · Enginn aðgangur · Ekkert netfang"}</span>
      </div>
    </div>,
    { width: 1200, height: 630, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "public, max-age=86400" } },
  );
}
