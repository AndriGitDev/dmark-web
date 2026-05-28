# dmark-web

Frontend and marketing website for Dmark, the Icelandic DMARC/SPF diagnostic and remediation product.

## Local Development

```sh
npm install
npm run dev
```

The marketing scanner lives at `/`. The product dashboard lives at `/dashboard`.

## Environment

- `DMARK_SCAN_API_URL`: backend public scan endpoint, e.g. `https://dmark.kastro.is/api/public/scan`.
- `DMARK_AUDIT_CLAIMS_API_URL`: optional backend audit-claim endpoint. If omitted, it is inferred from `DMARK_SCAN_API_URL` by replacing `/scan` with `/audit-claims`.
- `DMARK_API_BASE_URL`: optional backend origin for relative backend endpoint values.
- `DMARK_API_TOKEN`: optional bearer token for the scan endpoint.
- `DMARK_USE_MOCK`: set to `false` to require the backend scan endpoint.
- `DMARK_APP_API_BASE_URL`: backend origin for the authenticated dashboard API, e.g. `http://localhost:8080`.
- `DMARK_APP_API_TOKEN`: server-only dashboard proxy bearer token with `domain:read`, `domain:write`, and `reporter:read`.
- `DMARK_DASHBOARD_MOCK`: set to `1` to use explicit dashboard mock fixtures; set to `0` for live backend mode.
- `NOCODB_WEBHOOK_URL`: optional upgrade-request webhook.

Production frontend settings:

```sh
DMARK_SCAN_API_URL=https://dmark.kastro.is/api/public/scan
DMARK_USE_MOCK=false
DMARK_APP_API_BASE_URL=https://dmark-backend.example
DMARK_APP_API_TOKEN=meil_production_dashboard_proxy_key
DMARK_DASHBOARD_MOCK=0
```
