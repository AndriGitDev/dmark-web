"use client";

import { useTranslations } from "next-intl";
import type { AuthenticationRecords } from "@/lib/authentication-records";

export function AuthenticationFindings({ records }: { records: AuthenticationRecords }) {
  const t = useTranslations("Authentication");
  return <>{(["dkim", "bimi"] as const).map(kind => {
    const observation = records[kind];
    if (!observation) return null;
    return <article key={kind} className="record-panel authentication-record">
      <h3 className="font-semibold">{t(`${kind}.title`)}</h3>
      <p className="mt-2 text-sm text-muted">{t(`states.${observation.state}`)}</p>
      <p className="mt-2 break-all font-mono text-xs text-muted">{observation.name}</p>
      {observation.record ? <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words rounded bg-midnight p-3 font-mono text-xs leading-6 text-white">{observation.record}</pre> : null}
      <p className="mt-3 text-sm leading-6 text-muted">{t(`${kind}.limit`)}</p>
    </article>;
  })}</>;
}
