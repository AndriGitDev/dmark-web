# Coolify production deployment

Production hostnames: dmark.is, www.dmark.is. Canonical host: www.dmark.is.

Coolify builds GitHub `main` using `Dockerfile.coolify` on Baracoa, publishes `ghcr.io/andrigitdev/dmark-web`, and deploys to Kastro-Host-A. Only the real production domains are assigned. Cloudflare proxied A records point to Host-A; Traefik manages origin HTTPS certificates using HTTP-01 on port 80. Existing apex-to-www redirects are preserved.

The container listens on port 3000. Docker and Coolify probe `/api/healthz` every 30 seconds, with a five-second timeout and three retries. Verify actual page and API behavior separately from liveness. Git pushes deploy automatically. Page-view analytics are disabled. The source Vercel project is intentionally retired. For rollback, use a previously successful deployment in Coolify while its image remains available, or rebuild a known-good Git commit using this Dockerfile. Keep the production domains and DNS on Coolify; do not recreate the Vercel project. Check application health and functional flows after rollback.

Build locally with `docker build -f Dockerfile.coolify .`. Never copy production environment values into the repository. Existing mail and unrelated DNS records must remain unchanged.

Dmark has no accounts; `DMARK_ACCOUNT_API_URL` and `DMARK_FRONTEND_ORIGIN` are no longer read and can be removed. Optional `KASTRO_LOOKUP_TOKEN` gives scans their own Kastro Lookup rate-limit bucket; it must match one of Lookup's `LOOKUP_SERVICE_TOKENS`. Generate it with `openssl rand -hex 32` and set it on both apps.
