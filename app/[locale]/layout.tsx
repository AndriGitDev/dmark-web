import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getMessages, getTranslations, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { PrivacyAnalytics } from "@/components/privacy-analytics";
import {routing} from "@/i18n/routing";
import "../globals.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-schibsted",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
});

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const t = await getTranslations({locale, namespace: 'Metadata'});

  return {
    metadataBase: new URL("https://dmark.is"),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        is: "/is",
        en: "/en",
      },
    },
    openGraph: {
      type: "website",
      url: `https://dmark.is/${locale}`,
      siteName: "dmark.is",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: [
        {
          url: "/brand/dmark-icon.png",
          width: 512,
          height: 512,
          alt: "dmark.is logo",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
      images: ["/brand/dmark-icon.png"],
    },
    robots: { index: true, follow: true },
    icons: {
      icon: "/brand/dmark-icon.png",
      apple: "/brand/dmark-icon.png",
    },
    manifest: "/manifest.webmanifest",
  };
}

export default async function RootLayout({
  children,
  params
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{locale: string}>;
}>) {
  const {locale} = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${schibsted.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider messages={{Marketing: messages.Marketing, Errors: messages.Errors, Workspace: messages.Workspace, Authentication: messages.Authentication}}>
          {children}
        </NextIntlClientProvider>
        <PrivacyAnalytics />
        <Analytics />
      </body>
    </html>
  );
}

