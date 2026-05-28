import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  DatabaseZap,
  Gauge,
  KeyRound,
  MailCheck,
  ShieldAlert,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export type DomainStatus = "protected" | "needs-work" | "monitoring";
export type AlertSeverity = "critical" | "high" | "medium" | "low";

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
  trend: string;
  tone: "blue" | "green" | "amber" | "red";
  icon: LucideIcon;
};

export type ProtectedDomain = {
  id: string;
  domain: string;
  owner: string;
  status: DomainStatus;
  score: number;
  dmarcPolicy: "none" | "quarantine" | "reject";
  spfLookups: number;
  dkimCoverage: number;
  alignmentRate: number;
  unknownSenders: number;
  lastChecked: string;
  nextAction: string;
};

export type SenderSource = {
  provider: string;
  volume: string;
  aligned: number;
  unknown: boolean;
  trend: string;
};

export type DashboardAlert = {
  id: string;
  severity: AlertSeverity;
  title: string;
  domain: string;
  detail: string;
  age: string;
};

export type Recommendation = {
  title: string;
  domain: string;
  impact: string;
  effort: "Low" | "Medium" | "High";
  due: string;
};

export type ActivityEvent = {
  title: string;
  detail: string;
  time: string;
  icon: LucideIcon;
};

export const dashboardMetrics: DashboardMetric[] = [
  {
    label: "Protected domains",
    value: "18",
    detail: "4 ready for p=reject",
    trend: "+3 this month",
    tone: "blue",
    icon: ShieldCheck,
  },
  {
    label: "Alignment rate",
    value: "96.4%",
    detail: "Across 1.8M messages",
    trend: "+2.1% in 7 days",
    tone: "green",
    icon: Gauge,
  },
  {
    label: "Open findings",
    value: "11",
    detail: "2 critical changes need review",
    trend: "-5 since Monday",
    tone: "amber",
    icon: AlertTriangle,
  },
  {
    label: "Unknown senders",
    value: "7",
    detail: "Mostly low-volume marketing tools",
    trend: "2 new today",
    tone: "red",
    icon: ShieldAlert,
  },
];

export const protectedDomains: ProtectedDomain[] = [
  {
    id: "kastro",
    domain: "kastro.is",
    owner: "Kastro HQ",
    status: "protected",
    score: 98,
    dmarcPolicy: "reject",
    spfLookups: 6,
    dkimCoverage: 100,
    alignmentRate: 99.2,
    unknownSenders: 0,
    lastChecked: "4 min ago",
    nextAction: "Keep monitoring weekly sender drift.",
  },
  {
    id: "northwind",
    domain: "northwind.is",
    owner: "Finance",
    status: "needs-work",
    score: 64,
    dmarcPolicy: "none",
    spfLookups: 13,
    dkimCoverage: 72,
    alignmentRate: 87.1,
    unknownSenders: 4,
    lastChecked: "16 min ago",
    nextAction: "Flatten SPF and move DMARC to quarantine at 25%.",
  },
  {
    id: "reknet",
    domain: "reknet.is",
    owner: "Operations",
    status: "monitoring",
    score: 82,
    dmarcPolicy: "quarantine",
    spfLookups: 9,
    dkimCoverage: 91,
    alignmentRate: 94.8,
    unknownSenders: 2,
    lastChecked: "41 min ago",
    nextAction: "Validate Sendgrid DKIM before p=reject.",
  },
  {
    id: "fjordpay",
    domain: "fjordpay.is",
    owner: "Payments",
    status: "needs-work",
    score: 71,
    dmarcPolicy: "quarantine",
    spfLookups: 11,
    dkimCoverage: 84,
    alignmentRate: 90.3,
    unknownSenders: 1,
    lastChecked: "1 hr ago",
    nextAction: "Remove stale HubSpot include and approve Brevo sender.",
  },
];

export const senderSources: SenderSource[] = [
  { provider: "Microsoft 365", volume: "842k", aligned: 99.8, unknown: false, trend: "+4%" },
  { provider: "Google Workspace", volume: "391k", aligned: 98.4, unknown: false, trend: "-1%" },
  { provider: "Sendgrid", volume: "184k", aligned: 92.1, unknown: false, trend: "+12%" },
  { provider: "Unclassified ASN 1299", volume: "18k", aligned: 41.7, unknown: true, trend: "new" },
  { provider: "Mailchimp", volume: "11k", aligned: 88.6, unknown: false, trend: "-6%" },
];

export const dashboardAlerts: DashboardAlert[] = [
  {
    id: "a1",
    severity: "critical",
    title: "DMARC policy relaxed to p=none",
    domain: "northwind.is",
    detail: "Record changed after the last registrar edit. Enforcement is no longer active.",
    age: "12 min",
  },
  {
    id: "a2",
    severity: "high",
    title: "SPF lookup limit exceeded",
    domain: "fjordpay.is",
    detail: "Current policy resolves to 11 DNS lookups. Some receivers may treat SPF as permerror.",
    age: "38 min",
  },
  {
    id: "a3",
    severity: "medium",
    title: "Unknown sender detected",
    domain: "reknet.is",
    detail: "DMARC aggregate reports include a new source that is failing DKIM alignment.",
    age: "2 hr",
  },
];

export const recommendations: Recommendation[] = [
  {
    title: "Quarantine northwind.is at 25%",
    domain: "northwind.is",
    impact: "Reduces spoofing risk while preserving room for sender cleanup.",
    effort: "Medium",
    due: "Today",
  },
  {
    title: "Approve Sendgrid DKIM selector",
    domain: "reknet.is",
    impact: "Unlocks p=reject readiness for high-volume product email.",
    effort: "Low",
    due: "Tomorrow",
  },
  {
    title: "Remove stale SPF include",
    domain: "fjordpay.is",
    impact: "Brings SPF back under the 10-lookup receiver limit.",
    effort: "Low",
    due: "This week",
  },
];

export const activityEvents: ActivityEvent[] = [
  {
    title: "Weekly trust report generated",
    detail: "Kastro HQ report includes zero unknown senders and 99.2% alignment.",
    time: "8 min ago",
    icon: CheckCircle2,
  },
  {
    title: "SPF flattening plan updated",
    detail: "fjordpay.is can drop one vendor include after Brevo validation.",
    time: "29 min ago",
    icon: DatabaseZap,
  },
  {
    title: "Reporter feed received",
    detail: "Google, Microsoft, and Yahoo aggregate reports imported successfully.",
    time: "1 hr ago",
    icon: MailCheck,
  },
  {
    title: "API key rotated",
    detail: "Monitoring integration key rotated by andri@kastro.is.",
    time: "Yesterday",
    icon: KeyRound,
  },
];

export const notificationChannels = [
  { name: "Security inbox", target: "security@kastro.is", active: true, icon: Bell },
  { name: "Slack incident channel", target: "#dmark-alerts", active: true, icon: ShieldAlert },
  { name: "Weekly executive digest", target: "Mondays 09:00", active: false, icon: MailCheck },
];
