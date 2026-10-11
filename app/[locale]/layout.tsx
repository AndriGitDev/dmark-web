import {NextIntlClientProvider, hasLocale} from 'next-intl';
import {getMessages, setRequestLocale} from 'next-intl/server';
import {notFound} from 'next/navigation';
import type { Metadata, Viewport } from "next";
import { contentForLocale } from "@/lib/public-content";
import { Analytics } from "@vercel/analytics/next";
import localFont from "next/font/local";
import { PrivacyAnalytics } from "@/components/privacy-analytics";
import {routing} from "@/i18n/routing";
import "../globals.css";

export const viewport: Viewport = { themeColor: "#0f0f0d", colorScheme: "dark", width: "device-width", initialScale: 1 };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({locale}));
}

const archivo = localFont({
  src: [
    { path: "../../public/fonts/archivo-latin.woff2", weight: "100 900", style: "normal" },
    { path: "../../public/fonts/archivo-latin-ext.woff2", weight: "100 900", style: "normal" },
  ],
  display: "swap",
  variable: "--font-archivo",
});
const jetbrains = localFont({
  src: [
    { path: "../../public/fonts/jetbrains-latin.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/jetbrains-latin-ext.woff2", weight: "400", style: "normal" },
  ],
  display: "swap",
  variable: "--font-jetbrains",
});

export async function generateMetadata({
  params
}: {
  params: Promise<{locale: string}>;
}): Promise<Metadata> {
  const {locale} = await params;
  const content = contentForLocale(locale);

  return {
    metadataBase: new URL("https://dmark.is"),
    title: content.title,
    description: content.description,
    alternates: {
      canonical: `/${locale}/`,
      languages: {
        is: "/is/",
        en: "/en/",
        "x-default": "/is/",
      },
    },
    openGraph: {
      type: "website",
      url: `https://dmark.is/${locale}/`,
      siteName: "Dmark by Kastro",
      locale: locale === "en" ? "en_GB" : "is_IS",
      alternateLocale: locale === "en" ? ["is_IS"] : ["en_GB"],
      title: content.title,
      description: content.description,
      images: [
        {
          url: `/social/${locale}/`,
          width: 1200,
          height: 630,
          alt: `${content.shareHeading} ${content.shareDescription}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: content.title,
      description: content.description,
      images: [{ url: `/social/${locale}/`, alt: `${content.shareHeading} ${content.shareDescription}` }],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    applicationName: "Dmark",
    creator: "Kastro",
    category: "technology",
    referrer: "strict-origin-when-cross-origin",
    formatDetection: { telephone: false },
    icons: {
      icon: [{ url: "/icons/192/", sizes: "192x192", type: "image/png" }, { url: "/icons/512/", sizes: "512x512", type: "image/png" }],
      apple: [{ url: "/icons/180/", sizes: "180x180", type: "image/png" }],
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
    <html lang={locale} className={`${archivo.variable} ${jetbrains.variable}`}>
      <body>
        <NextIntlClientProvider messages={{App: messages.App, Errors: messages.Errors, Workspace: messages.Workspace, Authentication: messages.Authentication}}>
          {children}
        </NextIntlClientProvider>
        <noscript><p className="noscript-notice">{locale === "en" ? "Enable JavaScript to check domains and save your progress. Product information and answers remain available below." : "Virkjaðu JavaScript til að athuga lén og vista yfirferð. Upplýsingar um tólið og svör við spurningum eru áfram aðgengileg hér á síðunni."}</p></noscript>
        <PrivacyAnalytics />
        <Analytics />
      </body>
    </html>
  );
}

