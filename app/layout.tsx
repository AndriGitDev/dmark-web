import type { Metadata } from "next";
import { JetBrains_Mono, Schibsted_Grotesk } from "next/font/google";
import { PrivacyAnalytics } from "@/components/privacy-analytics";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://dmark.is"),
  title: "dmark.is | Icelandic DMARC and SPF protection",
  description:
    "Run a public DMARC and SPF scanner for Icelandic domains, then request early access for beta SPF automation and reporting.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://dmark.is/",
    siteName: "dmark.is",
    title: "dmark.is | Icelandic DMARC and SPF protection",
    description:
      "Scan public DNS for DMARC and SPF risk, understand spoofing exposure, and plan a safe path toward p=reject.",
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
    title: "dmark.is | Icelandic DMARC and SPF protection",
    description:
      "Public DMARC and SPF scanner for Icelandic domains, with beta automation and reporting on request.",
    images: ["/brand/dmark-icon.png"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: "/brand/dmark-icon.png",
    apple: "/brand/dmark-icon.png",
  },
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${schibsted.variable} ${jetbrains.variable}`}>
      <body>
        {children}
        <PrivacyAnalytics />
      </body>
    </html>
  );
}
