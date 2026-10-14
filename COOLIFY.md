# Coolify production deployment

Production hostnames: dmark.is, www.dmark.is. Canonical host: www.dmark.is.

Coolify builds GitHub `main` using `Dockerfile.coolify` on Baracoa, publishes `ghcr.io/andrigitdev/dmark-web`, and deploys to Kastro-Host-A. Only the real production domains are assigned. Cloudflare proxied A records point to Host-A; Traefik manages origin HTTPS certificates using HTTP-01 on port 80. Existing apex-to-www redirects are preserved.

The container listens on port 3000. Docker and Coolify probe `/api/healthz` every 30 seconds, with a five-second timeout and three retries. Verify actual page and API behavior separately from liveness. Git pushes deploy automatically. Page-view analytics are disabled. Vercel deployments remain available for rollback; automatic Vercel builds are disabled after successful cutover.

Build locally with `docker build -f Dockerfile.coolify .`. Never copy production environment values into the repository. Existing mail and unrelated DNS records must remain unchanged.

Account sync is optional and disabled while no `DMARK_ACCOUNT_API_URL` is configured. Guest workspaces and DNS scanning remain available. Configure a working account backend URL and redeploy before enabling account sync; the retired default hostname must not be probed on page load.
