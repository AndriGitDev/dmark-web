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
- `DMARK_API_BASE_URL`: backend origin for the authenticated dashboard API, e.g. `http://localhost:8080`.
- `DMARK_API_TOKEN`: server-only dashboard proxy bearer token with `domain:read`, `domain:write`, and `reporter:read`.
- `DMARK_APP_API_BASE_URL`: legacy alias for `DMARK_API_BASE_URL`.
- `DMARK_APP_API_TOKEN`: legacy alias for `DMARK_API_TOKEN`.
- `DMARK_API_TIMEOUT_MS`: optional dashboard backend request timeout in milliseconds. Defaults to `10000`.
- `DMARK_DASHBOARD_ACCESS`: keeps `/dashboard` and `/api/dashboard/*` closed unless set to `open`, `true`, `yes`, or `1`.
- `DMARK_DASHBOARD_MOCK`: set to `1` to use explicit dashboard mock fixtures; set to `0` for live backend mode.
- `DMARK_DASHBOARD_AUTHENTIK_ISSUER`: customer Authentik OIDC provider issuer for the separate `dmark-dashboard` app/provider.
- `DMARK_DASHBOARD_AUTHENTIK_CLIENT_ID`: customer Authentik OAuth2/OIDC client ID, e.g. `dmark-dashboard`.
- `DMARK_DASHBOARD_AUTHENTIK_CLIENT_SECRET`: server-only customer Authentik OAuth2/OIDC client secret.
- `DMARK_DASHBOARD_AUTHENTIK_REDIRECT_URI`: exact customer callback URL registered in Authentik, `https://dmark.is/api/dashboard/auth/callback`.
- `DMARK_DASHBOARD_AUTHENTIK_SESSION_SECRET`: server-only high-entropy customer dashboard cookie signing secret.
- `DMARK_DASHBOARD_AUTHENTIK_ALLOWED_EMAILS`: comma-separated customer emails allowed into `/dashboard`.
- `DMARK_DASHBOARD_AUTHENTIK_ALLOWED_GROUPS`: comma-separated Authentik groups allowed into `/dashboard`; at least one allowed customer email or group is required.
- `DMARK_AUTHENTIK_ISSUER`: admin Authentik OIDC provider issuer for the separate `dmark-web-admin` app/provider.
- `DMARK_AUTHENTIK_CLIENT_ID`: Authentik OAuth2/OIDC client ID for dmark-web.
- `DMARK_AUTHENTIK_CLIENT_SECRET`: server-only Authentik OAuth2/OIDC client secret.
- `DMARK_AUTHENTIK_REDIRECT_URI`: exact callback URL registered in Authentik, e.g. `https://dmark.is/api/auth/callback`.
- `DMARK_AUTHENTIK_SESSION_SECRET`: server-only high-entropy cookie signing secret.
- `DMARK_AUTHENTIK_ALLOWED_EMAILS`: comma-separated owner emails allowed into `/admin`.
- `DMARK_AUTHENTIK_ALLOWED_GROUPS`: comma-separated Authentik groups allowed into `/admin`; at least one allowed email or group is required.
- `DMARK_PUBLIC_ORIGIN`: optional public frontend origin used for unconfigured Authentik login redirects.
- `DMARK_ADMIN_ACCESS` / `DMARK_ADMIN_OWNER_SESSION_SECRET`: optional local operator header guard for server-side admin smoke tests; production admin login should use the admin Authentik provider.
- `NOCODB_WEBHOOK_URL`: optional upgrade-request webhook.

Production frontend settings:

```sh
DMARK_SCAN_API_URL=https://dmark.kastro.is/api/public/scan
DMARK_USE_MOCK=false
DMARK_API_BASE_URL=https://dmark-backend.example
DMARK_API_TOKEN=meil_production_dashboard_proxy_key
DMARK_DASHBOARD_ACCESS=closed
DMARK_DASHBOARD_MOCK=0
DMARK_DASHBOARD_AUTHENTIK_ISSUER=https://auth.example.is/application/o/dmark-dashboard/
DMARK_DASHBOARD_AUTHENTIK_CLIENT_ID=dmark-dashboard
DMARK_DASHBOARD_AUTHENTIK_CLIENT_SECRET=store_only_in_coolify
DMARK_DASHBOARD_AUTHENTIK_REDIRECT_URI=https://dmark.is/api/dashboard/auth/callback
DMARK_DASHBOARD_AUTHENTIK_SESSION_SECRET=generate_separate_customer_secret
DMARK_DASHBOARD_AUTHENTIK_ALLOWED_EMAILS=customer@example.is
DMARK_DASHBOARD_AUTHENTIK_ALLOWED_GROUPS=dmark-customers
DMARK_AUTHENTIK_ISSUER=https://auth.example.is/application/o/dmark-web-admin/
DMARK_AUTHENTIK_CLIENT_ID=dmark-web-admin
DMARK_AUTHENTIK_CLIENT_SECRET=store_only_in_coolify
DMARK_AUTHENTIK_REDIRECT_URI=https://dmark.is/api/auth/callback
DMARK_AUTHENTIK_SESSION_SECRET=generate_high_entropy_secret
DMARK_AUTHENTIK_ALLOWED_EMAILS=owner@example.is
DMARK_AUTHENTIK_ALLOWED_GROUPS=dmark-admins
```

Authentik application/provider setup is human-gated: keep the admin provider/app (`dmark-web-admin`, callback `/api/auth/callback`) separate from the customer dashboard provider/app (`dmark-dashboard`, callback `/api/dashboard/auth/callback`), then paste only the resulting values into Coolify/server env. Do not paste client secrets into chat or commit them.
