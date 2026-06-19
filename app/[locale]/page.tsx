import { setRequestLocale } from "next-intl/server";
import { DmarkMarketing } from "@/components/dmark-marketing";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <DmarkMarketing />;
}
