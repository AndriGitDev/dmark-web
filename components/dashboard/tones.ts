import type {
  AlertSeverity,
  BrandRiskSeverity,
  DashboardMetric,
  DomainStatus,
} from "@/lib/dashboard";

export function metricTone(tone: DashboardMetric["tone"]) {
  switch (tone) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "red":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

export function statusTone(status: DomainStatus) {
  switch (status) {
    case "protected":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "monitoring":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export function severityTone(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "high":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function brandRiskSeverityTone(severity: BrandRiskSeverity) {
  switch (severity) {
    case "Critical":
      return "border-red-200 bg-red-50 text-red-700";
    case "High":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "Medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Low":
      return "border-blue-200 bg-blue-50 text-blue-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

export function changeStatusTone(status: string) {
  switch (status) {
    case "ready":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "review":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "blocked":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-amber-200 bg-amber-50 text-amber-700";
  }
}

export function spfRouteToneClass(tone: "green" | "amber" | "red" | "blue") {
  switch (tone) {
    case "green":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "red":
      return "border-red-200 bg-red-50 text-red-700";
    case "amber":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-blue-200 bg-blue-50 text-blue-700";
  }
}

export function formatStatus(status: DomainStatus) {
  if (status === "needs-work") return "Needs work";
  if (status === "monitoring") return "Monitoring";
  return "Protected";
}
