const allowedProviders = ["plausible", "umami", "posthog"] as const;

type AnalyticsProvider = (typeof allowedProviders)[number];

type AnalyticsConfig = {
  provider: AnalyticsProvider;
  domain: string;
  scriptURL: string;
  siteID: string | null;
};

function configuredProvider(value: string | undefined): AnalyticsProvider | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if ((allowedProviders as readonly string[]).includes(normalized)) return normalized as AnalyticsProvider;
  return null;
}

function hostMatchesDomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function providerHostAllowed(provider: AnalyticsProvider, parsed: URL, domain: string): boolean {
  const hostname = parsed.hostname.toLowerCase();
  const pathname = parsed.pathname.toLowerCase();

  if (parsed.search || parsed.hash) return false;

  switch (provider) {
    case "plausible":
      return (hostname === "plausible.io" || hostMatchesDomain(hostname, domain)) && pathname === "/js/script.js";
    case "umami":
      return (hostname === "cloud.umami.is" || hostMatchesDomain(hostname, domain)) && pathname === "/script.js";
    case "posthog":
      return hostMatchesDomain(hostname, domain) && pathname === "/static/array.js";
  }
}

function configuredScriptURL(value: string | undefined, provider: AnalyticsProvider, domain: string): string | null {
  if (!value) return null;

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:") return null;
    if (!parsed.hostname) return null;
    if (!providerHostAllowed(provider, parsed, domain)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function configuredDomain(value: string | undefined): string | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("://") || normalized.includes("/") || normalized.includes(" ")) return null;
  if (!normalized.includes(".")) return null;
  return normalized;
}

function configuredSiteID(provider: AnalyticsProvider, value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  if (!/^[A-Za-z0-9._:-]{1,128}$/.test(normalized)) return null;
  if (provider === "plausible") return null;
  return normalized;
}

export function getAnalyticsConfig(): AnalyticsConfig | null {
  const provider = configuredProvider(process.env.DMARK_ANALYTICS_PROVIDER);
  const domain = configuredDomain(process.env.DMARK_ANALYTICS_DOMAIN);

  if (!provider || !domain) return null;

  const scriptURL = configuredScriptURL(process.env.DMARK_ANALYTICS_SCRIPT_URL, provider, domain);
  if (!scriptURL) return null;

  return {
    provider,
    domain,
    scriptURL,
    siteID: configuredSiteID(provider, process.env.DMARK_ANALYTICS_SITE_ID),
  };
}
