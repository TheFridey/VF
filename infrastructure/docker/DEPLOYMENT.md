# VeteranFinder Deployment Runbook

## Overview

Production deploys are now image-based:

1. GitHub Actions builds `api`, `web`, and `admin` images.
2. Images are pushed to GHCR with the commit SHA and an environment alias tag.
3. The deploy workflow connects to the server over SSH.
4. Docker Compose pulls the new images, restarts the app containers, runs Prisma migrations, and performs a health check.

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

## First-Time Server Setup

```bash
git clone git@github.com:your-org/veteranfinder.git /opt/veteranfinder
cd /opt/veteranfinder
cp apps/api/.env.example .env
```

Populate `.env` with your production secrets, then ensure Docker is installed and the server can pull from GHCR:

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
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env up -d api web admin
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env exec -T api npx prisma migrate deploy
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
- Prisma migrations are executed after the new API container is up.
