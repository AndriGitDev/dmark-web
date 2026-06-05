"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { trackPrivacyEvent } from "@/lib/privacy-events";

type DashboardLockedCTASource = "dashboard_beta_lock_scan" | "dashboard_beta_lock_access";

type DashboardLockedCTALinkProps = Omit<ComponentProps<typeof Link>, "onClick"> & {
  source: DashboardLockedCTASource;
  children: ReactNode;
};

export function DashboardLockedCTALink({ source, children, ...props }: DashboardLockedCTALinkProps) {
  return (
    <Link
      {...props}
      onClick={() => {
        trackPrivacyEvent("cta_click", { source });
      }}
    >
      {children}
    </Link>
  );
}
