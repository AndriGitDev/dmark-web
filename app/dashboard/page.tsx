import type { Metadata } from "next";
import { DmarkDashboard } from "@/components/dmark-dashboard";

export const metadata: Metadata = {
  title: "Dashboard | dmark.is",
  description: "Dmark domain trust operations dashboard for DMARC, SPF, Reporter, alerts, and remediation.",
};

export default function DashboardPage() {
  return <DmarkDashboard />;
}
