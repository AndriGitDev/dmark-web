import {NextIntlClientProvider} from 'next-intl';
import {getMessages, getTranslations} from 'next-intl/server';
import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { PrivacyAnalytics } from "@/components/privacy-analytics";
import "../globals.css";

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
      canonical: "/",
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
  const messages = await getMessages();

  return (
    <html lang={locale} className={`${schibsted.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
