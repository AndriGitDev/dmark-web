"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  Globe2,
  LayoutDashboard,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const navItems = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "domains", label: "Domains", icon: Globe2 },
  { id: "reporter", label: "Reporter", icon: BarChart3 },
  { id: "brand-risk", label: "Brand Risk", icon: ShieldAlert },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type TabID = (typeof navItems)[number]["id"];

export function DashboardSidebar({ activeTab, onSelect }: { activeTab: TabID; onSelect: (tab: TabID) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-6">
        <Link href="/" className="flex items-center gap-3" aria-label="dmark.is home">
          <span className="grid h-10 w-10 place-items-center rounded-md bg-navy text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-semibold tracking-tight">dmark.is</span>
            <span className="block font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted">
              Trust operations
            </span>
          </span>
        </Link>
      </div>
      <nav className="grid gap-1 p-4" aria-label="Dashboard navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition ${
                active ? "bg-blue-50 text-trust" : "text-slate-600 hover:bg-slate-50 hover:text-navy"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-slate-200 p-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <Sparkles className="h-5 w-5 text-trust" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-navy">Live trust operations</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Review domain posture, sender evidence, and DNS changes from one workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
