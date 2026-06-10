import Link from "next/link";
import { Search } from "lucide-react";

export const metadata = {
  title: "Page not found | dmark.is",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 text-ink">
      <div className="w-full max-w-xl rounded border border-line bg-card p-8 text-center shadow-editorial">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-ink">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">This page does not exist.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-500">
          The address may have changed, or the link was mistyped. The public scanner is always available from the front
          page.
        </p>
        <div className="mt-7 flex justify-center">
          <Link
            href="/"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded bg-brand-ink px-5 font-semibold text-white shadow-glow transition hover:bg-brand"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            Back to the scanner
          </Link>
        </div>
      </div>
    </main>
  );
}
