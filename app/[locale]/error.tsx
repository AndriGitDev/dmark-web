"use client";

import { RefreshCw, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("Errors");
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 text-ink">
      <div className="w-full max-w-xl rounded border border-line bg-card p-8 text-center shadow-editorial">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-ink">{t("somethingBroke")}</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{t("unexpectedError")}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-500">
          {t("errorDetail")}
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-brand-ink px-5 font-semibold text-white shadow-glow transition hover:bg-brand"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t("tryAgain")}
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-line-strong px-5 font-semibold text-ink transition hover:border-ink"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {t("backToScanner")}
          </Link>
        </div>
      </div>
    </main>
  );
}
