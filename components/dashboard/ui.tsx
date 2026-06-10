"use client";

import {
  AlertTriangle,
  CheckCircle2,
  DatabaseZap,
  Gauge,
  KeyRound,
  MailCheck,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { DashboardIconName } from "@/lib/dashboard";

export function dashboardIcon(icon: DashboardIconName): LucideIcon {
  switch (icon) {
    case "alert-triangle":
      return AlertTriangle;
    case "check-circle":
      return CheckCircle2;
    case "database-zap":
      return DatabaseZap;
    case "gauge":
      return Gauge;
    case "key":
      return KeyRound;
    case "mail-check":
      return MailCheck;
    case "shield-alert":
      return ShieldAlert;
    default:
      return ShieldCheck;
  }
}

export function CompactStat({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-white px-4 py-3">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-navy">{value}</p>
      {detail ? <p className="mt-1 text-xs text-slate-500">{detail}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  detail,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
}) {
  return (
    <article className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
      <Icon className="mx-auto h-8 w-8 text-trust" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-semibold text-navy">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{detail}</p>
    </article>
  );
}

export function PanelNotice({ text, tone = "info" }: { text: string; tone?: "info" | "error" }) {
  return (
    <p
      className={`mt-4 rounded-md border px-4 py-3 text-sm leading-6 ${
        tone === "error"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-blue-200 bg-blue-50 text-blue-800"
      }`}
    >
      {text}
    </p>
  );
}
