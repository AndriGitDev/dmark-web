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
    <div className="rounded border border-line bg-card px-4 py-3">
      <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-ink-400">{label}</p>
      <p className="mt-2 text-xl font-semibold tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-1 text-xs text-ink-400">{detail}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  detail,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <article className="rounded border border-line bg-card p-8 text-center shadow-sm">
      <Icon className="mx-auto h-8 w-8 text-brand-ink" aria-hidden="true" />
      <h3 className="mt-4 text-xl font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-500">{detail}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded bg-brand-ink px-5 text-sm font-semibold text-white shadow-glow transition hover:bg-brand"
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <span className={`block animate-pulse rounded bg-paper-soft ${className}`} aria-hidden="true" />;
}

export function PanelSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-4 grid gap-3" role="status" aria-label="Loading">
      <Skeleton className="h-5 w-2/5" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export function RetryNotice({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="mt-4 flex flex-col justify-between gap-3 rounded border border-fail/30 bg-fail-soft px-4 py-3 sm:flex-row sm:items-center">
      <p className="text-sm leading-6 text-fail-ink">{text}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded border border-fail/40 bg-card px-4 text-sm font-semibold text-fail-ink transition hover:border-fail"
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}

export function PanelNotice({ text, tone = "info" }: { text: string; tone?: "info" | "error" }) {
  return (
    <p
      className={`mt-4 rounded border px-4 py-3 text-sm leading-6 ${
        tone === "error"
          ? "border-fail/30 bg-fail-soft text-fail-ink"
          : "border-brand/30 bg-brand-soft text-brand-ink"
      }`}
    >
      {text}
    </p>
  );
}
