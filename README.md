# dmark-web

Static bilingual marketing site for dmark.is, an Icelandic DMARC/SPF education and Kastro service landing page.

The interactive domain checker is a browser-only demonstration. It creates illustrative SPF and DMARC examples locally and does not query live DNS.

## Local development

```sh
npm install
npm run dev
```

The Icelandic site is at `/is/` and the English site is at `/en/`.

## Static build

```sh
npm test
npm run lint
npm run build
```

`npm run build` uses Next.js static export and writes the deployable site to `out/`. There are no route handlers, server functions, authentication flows, dashboards, backend proxies, or runtime secrets.

## Vercel

The `kastro-projects/dmark-web` Vercel project can deploy the repository with the standard Next.js preset. `vercel.json` redirects `/` to the Icelandic static page at `/is/`.

No backend environment variables are required. The optional privacy-friendly analytics settings are evaluated at build time:

- `DMARK_ANALYTICS_PROVIDER`: `plausible`, `umami`, or `posthog`.
- `DMARK_ANALYTICS_DOMAIN`: public site/domain identifier.
- `DMARK_ANALYTICS_SCRIPT_URL`: approved script URL for the selected provider.
- `DMARK_ANALYTICS_SITE_ID`: site identifier for Umami or PostHog.

Calls to action leave dmark.is and open the matching dmark service page on kastro.is.
