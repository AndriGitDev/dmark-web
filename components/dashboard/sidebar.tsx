"use client";

import Image from "next/image";
import { Link } from "@/i18n/routing";
import { useTranslations } from "next-intl";
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
  { id: "overview", icon: LayoutDashboard },
  { id: "domains", icon: Globe2 },
  { id: "reporter", icon: BarChart3 },
  { id: "brand-risk", icon: ShieldAlert },
  { id: "alerts", icon: Bell },
  { id: "settings", icon: Settings },
] as const;

export type TabID = (typeof navItems)[number]["id"];

export function DashboardSidebar({ activeTab, onSelect }: { activeTab: TabID; onSelect: (tab: TabID) => void }) {
  const t = useTranslations("Dashboard.sidebar");
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-line p-6">
        <Link href="/" className="grid gap-3" aria-label="dmark.is home">
          <Image className="h-10 w-auto justify-self-start" src="/brand/dmark-logo.png" alt="dmark.is" width={769} height={240} sizes="128px" priority />
          <span className="font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-500">
            {t("trustOpsSubtitle")}
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
              {t(item.id)}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-line p-4">
        <div className="rounded border border-brand/30 bg-brand-soft p-4">
          <Sparkles className="h-5 w-5 text-brand-ink" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-ink">{t("trustOps")}</p>
          <p className="mt-2 text-sm leading-6 text-ink-500">
            {t("trustOpsDescription")}
          </p>
        </div>
      </div>
    </div>
  );
}
