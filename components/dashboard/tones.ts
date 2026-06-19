import { useTranslations } from "next-intl";
import type {
  AlertSeverity,
  BrandRiskSeverity,
  DashboardMetric,
  DomainStatus,
} from "@/lib/dashboard";

export function metricTone(tone: DashboardMetric["tone"]) {
  switch (tone) {
    case "green":
      return "border-pass/30 bg-pass-soft text-pass-ink";
    case "amber":
      return "border-warn/30 bg-warn-soft text-warn-ink";
    case "red":
      return "border-fail/30 bg-fail-soft text-fail-ink";
    default:
      return "border-brand/30 bg-brand-soft text-brand-ink";
  }
}

export function statusTone(status: DomainStatus) {
  switch (status) {
    case "protected":
      return "border-pass/30 bg-pass-soft text-pass-ink";
    case "monitoring":
      return "border-brand/30 bg-brand-soft text-brand-ink";
    default:
      return "border-warn/30 bg-warn-soft text-warn-ink";
  }
}

export function severityTone(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "border-fail/40 bg-fail-soft text-fail-ink";
    case "high":
      return "border-fail/25 bg-fail-soft text-fail-ink";
    case "medium":
      return "border-warn/30 bg-warn-soft text-warn-ink";
    default:
      return "border-line bg-paper text-ink-500";
  }
}

export function brandRiskSeverityTone(severity: BrandRiskSeverity) {
  switch (severity) {
    case "Critical":
      return "border-fail/40 bg-fail-soft text-fail-ink";
    case "High":
      return "border-fail/25 bg-fail-soft text-fail-ink";
    case "Medium":
      return "border-warn/30 bg-warn-soft text-warn-ink";
    case "Low":
      return "border-brand/30 bg-brand-soft text-brand-ink";
    default:
      return "border-line bg-paper text-ink-500";
  }
}

export function changeStatusTone(status: string) {
  switch (status) {
    case "ready":
      return "border-pass/30 bg-pass-soft text-pass-ink";
    case "review":
      return "border-brand/30 bg-brand-soft text-brand-ink";
    case "blocked":
      return "border-fail/30 bg-fail-soft text-fail-ink";
    default:
      return "border-warn/30 bg-warn-soft text-warn-ink";
  }
}

export function spfRouteToneClass(tone: "green" | "amber" | "red" | "blue") {
  switch (tone) {
    case "green":
      return "border-pass/30 bg-pass-soft text-pass-ink";
    case "red":
      return "border-fail/30 bg-fail-soft text-fail-ink";
    case "amber":
      return "border-warn/30 bg-warn-soft text-warn-ink";
    default:
      return "border-brand/30 bg-brand-soft text-brand-ink";
  }
}

export function useFormatStatus() {
  const t = useTranslations("Dashboard.statuses");
  return (status: DomainStatus) => {
    if (status === "needs-work") return t("needs-work");
    if (status === "monitoring") return t("monitoring");
    return t("protected");
  };
}
