"use client";

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Bell,
  Globe2,
  LayoutDashboard,
  Settings,
  ShieldAlert,
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
      <div className="border-b border-line p-6">
        <Link href="/" className="grid gap-3" aria-label="dmark.is home">
          <Image className="h-10 w-auto justify-self-start" src="/brand/dmark-logo.png" alt="dmark.is" width={769} height={240} sizes="128px" priority />
          <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            Trust operations
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
              className={`flex min-h-11 items-center gap-3 rounded px-3 text-sm font-semibold transition ${
                active ? "bg-brand-soft text-brand-ink" : "text-ink-500 hover:bg-paper hover:text-ink"
              }`}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-line p-4">
        <div className="rounded border border-brand/30 bg-brand-soft p-4">
          <Sparkles className="h-5 w-5 text-brand-ink" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink">Live trust operations</p>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            Review domain posture, sender evidence, and DNS changes from one workspace.
          </p>
        </div>
      </div>
    </div>
  );
}
