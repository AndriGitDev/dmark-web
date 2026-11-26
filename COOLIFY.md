# Production deployment on Coolify

dmark.is runs on [Coolify](https://coolify.io). This document describes that setup. To run dmark elsewhere, the Docker image in the [README](README.md#deployment) is all you need.

## Hostnames

Production serves `dmark.is` and `www.dmark.is`. The canonical host is `www.dmark.is`, and the apex redirects to it. Only the real production domains are assigned to the app.

Cloudflare proxied A records point to the production host. Traefik manages origin HTTPS certificates using HTTP-01 on port 80.

## Build and deploy

Coolify builds the GitHub `main` branch with `Dockerfile.coolify`, publishes `ghcr.io/andrigitdev/dmark-web` and deploys it. Pushes to `main` deploy automatically.

Build the same image locally with:

```sh
docker build -f Dockerfile.coolify .
```

## Health checks

The container listens on port 3000. Docker and Coolify probe `/api/healthz` every 30 seconds, with a five-second timeout and three retries. The probe shows only that the process is alive, so verify page and API behavior separately.

## Environment

All settings are optional and listed in the [README](README.md#configuration). Never copy production environment values into the repository.

`KASTRO_LOOKUP_TOKEN` gives scans their own Kastro Lookup rate-limit bucket. It must match one of Lookup's `LOOKUP_SERVICE_TOKENS`. Generate it with `openssl rand -hex 32` and set it on both apps.

Page-view analytics are disabled in production.

dmark has no accounts. `DMARK_ACCOUNT_API_URL` and `DMARK_FRONTEND_ORIGIN` are no longer read and can be removed from older deployments.

## Rollback

Use a previously successful deployment in Coolify while its image remains available, or rebuild a known-good Git commit with this Dockerfile. Check application health and the functional flows afterwards.

The earlier Vercel project is retired on purpose. Keep the production domains and DNS on Coolify and do not recreate it. Existing mail and unrelated DNS records must remain unchanged.
