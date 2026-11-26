# dmark

[![Verify](https://github.com/AndriGitDev/dmark-web/actions/workflows/verify.yml/badge.svg)](https://github.com/AndriGitDev/dmark-web/actions/workflows/verify.yml)
[![License: AGPL-3.0-only](https://img.shields.io/badge/license-AGPL--3.0--only-blue.svg)](LICENSE)

dmark tells you in plain language whether someone can send email pretending to be your domain, and gives you the exact DNS records to fix it. It checks SPF, DKIM, DMARC and BIMI, in Icelandic and English, with no account and no email address.

**Try it at [dmark.is](https://www.dmark.is).**

This repository is the web app. The [Go backend](https://github.com/AndriGitDev/dmark-app) holds additional email-authentication services. dmark is built and run by [Kastro](https://kastro.is/en).

## What it does

- **A plain verdict.** Each domain is rated protected, partly protected or not protected.
- **A step-by-step fix.** The steps come in a safe order, with copyable records for the detected email provider and DNS host.
- **A message for your IT contact.** A ready-written email carries the exact records to whoever manages the domain.
- **Technical details on request.** Raw records, a DKIM selector check, a BIMI publication check and a five-check DNS readiness score.
- **An SPF snapshot generator.** It flattens a supported SPF record into explicit networks, on demand.
- **Guides.** Static pages cover DMARC, SPF, DKIM, Microsoft 365, Google Workspace and domains that send no email.

dmark reads public DNS and gives guidance. It never changes DNS, does not monitor domains continuously and does not receive DMARC reports. A result describes published DNS records; it does not certify that every message is authenticated.

## Privacy

- There are no accounts: no sign-up, password, session or email address.
- Saved domains live in a first-party cookie in the visitor's browser.
- A check sends only the domain name and an optional DKIM selector to the server. Results are not stored server-side.
- Analytics are off unless configured, and events never include the domain.

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes exactly what is stored and where.

## Quick start

You need Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open <http://localhost:3000/en/> or <http://localhost:3000/is/>. Live checks call the public Kastro Lookup service, so they need network access.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server. |
| `npm test` | Run the unit tests with the Node.js test runner. |
| `npm run lint` | Run ESLint. |
| `npm run build` | Create the production build. |
| `npm run test:launch` | Check the build output: metadata, structured data, sitemap, robots, icons and color contrast. Run it after `npm run build`. |
| `npm run test:browser` | Run the Playwright suite, including axe-core accessibility checks. Run `npx playwright install chromium` first. |

The browser suite uses mocked DNS responses. Passing it does not confirm the deployed Lookup service or real DNS results.

## Configuration

Every setting is optional. The app runs with none of them.

| Variable | Purpose |
| --- | --- |
| `KASTRO_LOOKUP_TOKEN` | Gives this deployment its own Kastro Lookup rate-limit bucket. It must match a token configured on the Lookup service. |
| `DMARK_ANALYTICS_PROVIDER` | `plausible`, `umami` or `posthog`. Analytics stay off unless this and the next two are valid. |
| `DMARK_ANALYTICS_DOMAIN` | The site domain reported to the analytics provider. |
| `DMARK_ANALYTICS_SCRIPT_URL` | HTTPS URL of the provider script. Only known provider paths are accepted. |
| `DMARK_ANALYTICS_SITE_ID` | Site identifier, for providers that need one. |

Never commit environment values to the repository.

## How it works

The app is built with Next.js, React, next-intl and Tailwind CSS. Pages under `/is/` and `/en/` are prerendered. Two Node.js route handlers do the live work:

- `POST /api/scan/` validates the domain, asks Kastro Lookup for SPF and DMARC evidence, and resolves DKIM and BIMI records directly. It stores nothing.
- `POST /api/spf/flatten/` resolves an SPF record and returns a flattened candidate with the source of every network.

Static export is disabled because these routes need a server.

| Path | Contents |
| --- | --- |
| `app/` | Routes, API handlers, sitemap, robots, social images and `llms.txt`. |
| `components/` | The workspace, fix plan, guides and SPF tool. |
| `lib/` | Scan mapping, scoring, mail setup plans, guide content and SPF flattening. |
| `messages/` | Icelandic and English interface strings. |
| `test/`, `scripts/` | Unit tests, launch checks and the browser suite. |

## Deployment

`Dockerfile.coolify` builds a standalone image that listens on port 3000 and exposes `/api/healthz` for health checks:

```sh
docker build -f Dockerfile.coolify -t dmark-web .
docker run --rm -p 3000:3000 dmark-web
```

[COOLIFY.md](COOLIFY.md) describes the production setup for dmark.is.

## Documentation

- [Project scope](docs/PROJECT.md)
- [Architecture and limits](docs/ARCHITECTURE.md)
- [Launch readiness](docs/LAUNCH_READINESS.md)
- [Production deployment](COOLIFY.md)

## Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) first. Report vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## License

Copyright (C) 2026 dmark contributors. Licensed under the [GNU Affero General Public License version 3](LICENSE) (`AGPL-3.0-only`).
