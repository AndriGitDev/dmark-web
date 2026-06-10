"use client";

import Link from "next/link";
import { RefreshCw, Search } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 text-ink">
      <div className="w-full max-w-xl rounded border border-line bg-card p-8 text-center shadow-editorial">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-ink">Something broke</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">This page hit an unexpected error.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-500">
          The error has not affected your domains or DNS records. Try again, or head back to the scanner.
        </p>
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-brand-ink px-5 font-semibold text-white shadow-glow transition hover:bg-brand"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded border border-line-strong px-5 font-semibold text-ink transition hover:border-ink"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Back to the scanner
          </Link>
        </div>
      </div>
    </main>
  );
}
