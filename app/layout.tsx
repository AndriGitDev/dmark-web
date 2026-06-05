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
  title: "dmark.is | Icelandic DMARC and SPF protection",
  description:
    "Scan Icelandic domains for DMARC and SPF risk, then unlock automated SPF flattening and readable DMARC reporting.",
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
