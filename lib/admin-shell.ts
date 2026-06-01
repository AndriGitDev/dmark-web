export type AdminShellStatus = "allowed" | "locked";

export type AdminShellSection = {
  id: "cases" | "spf-route-audit" | "abuse-decisions" | "provider-health" | "operational-events" | "company-onboarding";
  title: string;
  description: string;
  status: string;
  affordance: string;
  scope: "global-owner";
};

export type AdminShellModel = {
  status: AdminShellStatus;
  eyebrow: string;
  title: string;
  description: string;
  sections: AdminShellSection[];
};

type AdminShellModelInput = {
  allowed: boolean;
};

const ADMIN_SECTIONS: AdminShellSection[] = [
  {
    id: "cases",
    title: "Cases",
    description: "Triage global support, remediation, and incident cases from the private backend admin surface.",
    status: "Shell only",
    affordance: "Use the server-side /api/admin proxy when backend case endpoints are ready.",
    scope: "global-owner",
  },
  {
    id: "spf-route-audit",
    title: "SPF route publication audit",
    description: "Inspect expected SPF route DNS records, persisted Bunny state, live recursive evidence, and DNS publication drift for a route.",
    status: "Backend endpoint ready",
    affordance: "Fetch through /api/admin/spf-routes/{routeID}/publication-audit only after the owner session gate passes.",
    scope: "global-owner",
  },
  {
    id: "abuse-decisions",
    title: "Abuse decisions",
    description: "Review owner-level abuse decisions, holds, and enforcement notes without exposing client dashboard controls.",
    status: "Shell only",
    affordance: "Keep actions server-mediated; no browser token access.",
    scope: "global-owner",
  },
  {
    id: "provider-health",
    title: "Provider and dependency health",
    description: "Track upstream providers, backend dependencies, scanner health, and queue pressure for operator awareness.",
    status: "Shell only",
    affordance: "Wire read-only health calls through /api/admin after backend contracts exist.",
    scope: "global-owner",
  },
  {
    id: "operational-events",
    title: "Recent operational events",
    description: "Reserve space for global audit, incident, and operational event summaries.",
    status: "Shell only",
    affordance: "Prefer redacted summaries and avoid placing secrets in rendered payloads.",
    scope: "global-owner",
  },
  {
    id: "company-onboarding",
    title: "Company and onboarding placeholder",
    description: "Placeholder for owner-managed company setup visibility; client organization dashboards stay separate.",
    status: "Placeholder",
    affordance: "Do not add public signup, billing, or subscription flows here.",
    scope: "global-owner",
  },
];

export function buildAdminShellModel({ allowed }: AdminShellModelInput): AdminShellModel {
  if (!allowed) {
    return {
      status: "locked",
      eyebrow: "Owner-only control plane",
      title: "Admin control plane locked",
      description: "Admin access requires an enabled server-side gate and a valid owner session. No backend admin affordances are shown without both.",
      sections: [],
    };
  }

  return {
    status: "allowed",
    eyebrow: "Owner-only control plane",
    title: "Dmark operator control plane",
    description: "A private shell for global Dmark operations. It is intentionally separate from client organization dashboards and exposes only proxy-aware placeholders until backend admin contracts are implemented.",
    sections: ADMIN_SECTIONS.map((section) => ({ ...section })),
  };
}
