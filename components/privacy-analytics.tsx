import Script from "next/script";
import { getAnalyticsConfig } from "@/lib/analytics";

export function PrivacyAnalytics() {
  const config = getAnalyticsConfig();
  if (!config) return null;

  if (config.provider === "plausible") {
    return <Script data-domain={config.domain} defer id="dmark-privacy-analytics" src={config.scriptURL} strategy="afterInteractive" />;
  }

  return (
    <Script
      data-domains={config.domain}
      data-website-id={config.siteID ?? undefined}
      defer
      id="dmark-privacy-analytics"
      src={config.scriptURL}
      strategy="afterInteractive"
    />
  );
}
