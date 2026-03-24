# VeteranFinder Container Deployment Runbook

This runbook is for the GHCR + Docker Compose deployment path.

If your target host runs `nginx + pm2` directly from source, use [../pm2/DEPLOYMENT.md](../pm2/DEPLOYMENT.md) instead.

## Overview

Container deploys are image-based:

1. GitHub Actions builds `api`, `web`, and `admin` images.
2. Images are pushed to GHCR with the commit SHA and an environment alias tag.
3. The deploy workflow connects to the server over SSH.
4. Docker Compose pulls the new images, runs Prisma migrations with the new API image, restarts the app containers, and performs a health check.

The server still uses `infrastructure/docker/docker-compose.yml`, but the compose file now supports both:

- local source builds with `docker compose up --build`
- remote image pulls with `VETERANFINDER_IMAGE_REGISTRY` and `VETERANFINDER_IMAGE_TAG`

## Required GitHub Secrets

Configure these in the target GitHub environment (`staging` or `production`):

- `SSH_HOST`
- `SSH_PORT`
- `SSH_USER`
- `SSH_PRIVATE_KEY`
- `DEPLOY_PATH`
- `GHCR_USERNAME`
- `GHCR_TOKEN`

## Required GitHub Environment Variables

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ADMIN_APP_URL`
- `NEXT_PUBLIC_WS_URL`
- `HEALTHCHECK_URL`

## Release safety assumptions

This workflow is safest when GitHub is configured to:

- protect `main`
- require the `VeteranFinder CI` workflow before merge
- require environment approval for `production`
- keep direct pushes to `main` rare or disabled

## First-Time Server Setup

```bash
git clone git@github.com:your-org/veteranfinder.git /opt/veteranfinder
cd /opt/veteranfinder
cp .env.example .env
```

Populate `.env` with your production secrets and live URLs, then ensure Docker is installed and the server can pull from GHCR:

Minimum live values to set before first deploy:

- `DB_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`
- `ENCRYPTION_KEY`
- `PASSWORD_PEPPER`
- `FRONTEND_URL=https://veteranfinder.co.uk`
- `ADMIN_URL=https://admin.veteranfinder.co.uk`
- `RESEND_API_KEY`
- `FROM_EMAIL`
- `CONTACT_EMAIL`
- `SUPPORT_EMAIL`
- `PRIVACY_EMAIL`
- `LEGAL_EMAIL`
- `PARTNERSHIPS_EMAIL_TO`
- `APP_URL=https://veteranfinder.co.uk`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_BIA_BASIC_MONTHLY`
- `STRIPE_PRICE_BIA_BASIC_ANNUAL`
- `STRIPE_PRICE_BIA_PLUS_MONTHLY`
- `STRIPE_PRICE_BIA_PLUS_ANNUAL`

For Stripe, configure the live webhook endpoint as:

- `https://veteranfinder.co.uk/api/v1/subscriptions/webhook`

Subscribe it to:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

Use the endpoint signing secret (`whsec_...`) as `STRIPE_WEBHOOK_SECRET`.

```bash
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
```

## Manual Pull-and-Restart Flow

If you need to repeat what the workflow does from the server:

```bash
cd /opt/veteranfinder
export VETERANFINDER_IMAGE_REGISTRY=ghcr.io/<owner>
export VETERANFINDER_IMAGE_TAG=<git-sha>

docker compose -f infrastructure/docker/docker-compose.yml --env-file .env pull api web admin
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env run --rm api npx prisma migrate deploy
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env up -d api web admin
curl -fsS https://veteranfinder.co.uk/api/v1/health/ready
```

## Local Build Flow

For local infrastructure testing you can still build from source:

```bash
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env up -d --build
```

## Notes

- `VETERANFINDER_IMAGE_TAG` defaults to `latest` if not set.
- `VETERANFINDER_IMAGE_REGISTRY` defaults to `ghcr.io/veteranfinder`.
- The deploy workflow only restarts `api`, `web`, and `admin`; PostgreSQL and Redis stay in place.
- Prisma migrations are executed before the new app containers are switched over.
