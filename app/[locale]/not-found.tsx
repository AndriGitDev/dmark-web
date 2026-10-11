import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";

export const metadata = {
  title: "Page not found | dmark.is",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  const t = useTranslations("Errors.notFound");
  const te = useTranslations("Errors");
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-5 text-ink">
      <div className="w-full max-w-xl rounded border border-line bg-card p-8 text-center shadow-editorial">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.22em] text-brand-ink">404</p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{t("heading")}</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-6 text-ink-500">
          {t("detail")}
        </p>
        <div className="mt-7 flex justify-center">
          <Link
            href="/"
            className="app-button"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
            {te("backToScanner")}
          </Link>
        </div>
      </div>
    </main>
  );
}

