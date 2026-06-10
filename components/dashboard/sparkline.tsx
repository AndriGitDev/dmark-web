"use client";

type SparklinePoint = { value: number; label?: string };

function normalizedPath(points: SparklinePoint[], width: number, height: number, pad: number) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0;
  return points
    .map((point, index) => {
      const x = pad + index * stepX;
      const y = pad + (height - pad * 2) * (1 - (point.value - min) / range);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function Sparkline({
  points,
  tone = "brand",
  ariaLabel,
  className = "h-10 w-full",
}: {
  points: SparklinePoint[];
  tone?: "brand" | "pass" | "warn" | "fail";
  ariaLabel: string;
  className?: string;
}) {
  if (points.length < 2) return null;
  const width = 160;
  const height = 40;
  const pad = 3;
  const path = normalizedPath(points, width, height, pad);
  const strokeClass =
    tone === "pass" ? "stroke-pass" : tone === "warn" ? "stroke-warn" : tone === "fail" ? "stroke-fail" : "stroke-brand";
  const fillClass =
    tone === "pass" ? "fill-pass/10" : tone === "warn" ? "fill-warn/10" : tone === "fail" ? "fill-fail/10" : "fill-brand/10";

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      role="img"
      aria-label={ariaLabel}
      preserveAspectRatio="none"
    >
      <path d={`${path} L${width - pad},${height - pad} L${pad},${height - pad} Z`} className={fillClass} stroke="none" />
      <path d={path} className={strokeClass} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function sparklineTone(points: SparklinePoint[]): "pass" | "warn" | "fail" | "brand" {
  if (points.length < 2) return "brand";
  const first = points[0].value;
  const last = points[points.length - 1].value;
  if (last > first) return "pass";
  if (last < first) return "fail";
  return "brand";
}
