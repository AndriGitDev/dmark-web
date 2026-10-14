import { setRequestLocale } from "next-intl/server";
import { DmarkApp } from "@/components/dmark-app";
import { PublicReference } from "@/components/public-reference";
import { publicStructuredData } from "@/lib/public-content";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(publicStructuredData(locale)).replace(/</g, "\\u003c") }} />
    <DmarkApp accountEnabled={Boolean(process.env.DMARK_ACCOUNT_API_URL)} reference={<PublicReference locale={locale} />} />
  </>;
}
