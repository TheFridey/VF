# VeteranFinder

VeteranFinder is a monorepo for a veteran reconnection platform with:

- `apps/web` — the public and member-facing Next.js app
- `apps/admin` — the dedicated admin console
- `apps/api` — the NestJS API with Prisma, Redis-backed services, and realtime gateways

## Current stack

The repo currently runs on:

- Node.js `20.x`
- npm `10+`
- Next.js `15.5.10` in both frontend apps
- React `18.3.1` in both frontend apps
- NestJS `10.3.x`
- Prisma `5.8.x`
- PostgreSQL `15`
- Redis `7`
- Jest, Vitest, and Playwright for testing

## Repo layout

```text
apps/
  api/         NestJS API, Prisma schema, tests, seeds
  web/         Public/member app
  admin/       Admin app
docs/          Product and project docs
infrastructure/
  docker/      Container deployment assets and runbooks
  pm2/         Single-server PM2 deployment runbook
nginx/         Reverse proxy config
scripts/       Shared repo scripts
coturn/        TURN config for video calling
```

## Runtime model

### Local development

Local development uses source code directly:

- API on `http://localhost:3000`
- Web on `http://localhost:3001`
- Admin on `http://localhost:3002`
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

Docker is only required for local infrastructure unless you are using the container deployment flow.

### Production and staging

There are two supported runtime paths in this repo:

1. Single-server `nginx + pm2`
   This is the current lightweight live-server runbook and is documented in [infrastructure/pm2/DEPLOYMENT.md](infrastructure/pm2/DEPLOYMENT.md).

2. Container deployment via GitHub Actions + GHCR + Docker Compose
   This is documented in [infrastructure/docker/DEPLOYMENT.md](infrastructure/docker/DEPLOYMENT.md).

Do not mix those approaches on the same host without an explicit migration plan.

## Quick start

### 1. Install dependencies

From the repo root:

```bash
npm run install:apps
```

### 2. Start local infrastructure

```bash
docker-compose up -d
```

That starts PostgreSQL and Redis for local work.

### 3. Create env files

Minimum local files:

```text
apps/api/.env
apps/web/.env.local
apps/admin/.env.local
```

Typical local setup:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
printf "NEXT_PUBLIC_API_URL=http://localhost:3000\n" > apps/admin/.env.local
```

Minimum frontend values:

```dotenv
# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001

# apps/admin/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Use the API example file as the source of truth for backend secrets and service settings.

### 4. Prepare the database

```bash
cd apps/api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 5. Run the apps

In separate terminals:

```bash
npm run dev --prefix apps/api
npm run dev --prefix apps/web
npm run dev --prefix apps/admin
```

## Windows build note

Production Next.js builds on Windows must be run from an `NTFS` volume. The repo includes a guard script that blocks production frontend builds on unsupported Windows filesystems because of the known `readlink` / `EISDIR` failure path inside Next.js.

If you are on a non-NTFS drive, use the container build path instead of direct frontend builds.

## Root scripts

| Command | Purpose |
| --- | --- |
| `npm run install:apps` | Install dependencies for API, web, and admin |
| `npm run dev:api` | Start the API in watch mode |
| `npm run dev:web` | Start the web app |
| `npm run dev:admin` | Start the admin app |
| `npm run build:api` | Build the API |
| `npm run build:web` | Build the web app |
| `npm run build:admin` | Build the admin app |
| `npm run typecheck` | Typecheck all apps |
| `npm run lint` | Lint all apps |
| `npm run build` | Build all apps |
| `npm run test:api` | API unit tests |
| `npm run test:api:e2e` | API end-to-end tests |
| `npm run test:web` | Web unit tests |
| `npm run test:web:e2e` | Web Playwright tests |
| `npm run test:admin` | Admin unit tests |
| `npm run test:admin:e2e` | Admin Playwright tests |

## Auth model

VeteranFinder uses cookie-based auth:

1. the frontend posts to `/api/*`
2. the API sets HttpOnly cookies
3. browser requests carry those cookies automatically
4. frontend state stores user/profile data, not raw auth tokens

That means:

- browser calls should go through the frontend rewrites
- `FRONTEND_URL` and `ADMIN_URL` must match the real browser origins
- cross-origin shortcuts will cause confusing auth failures

## Blog content

The blog system lives in the API and web apps. The main safe seed entry points are:

- `apps/api/prisma/seed.ts` — full local seed flow
- `apps/api/prisma/seed-blog-posts.ts` — blog-only seeding for production-safe article imports

If you only want to load scheduled blog content on a live database, use the blog-only seed path rather than the full demo seed.

## CI and deployment

Current workflows:

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)

Release expectations:

- CI must pass before a deploy is allowed
- automatic deploys are limited to successful CI runs from `main`
- production should be protected by GitHub environment approvals and branch protection

Recommended branch protection for `main`:

- require pull requests
- require the `VeteranFinder CI` workflow to pass
- prevent force pushes
- restrict direct pushes to administrators only if they are still needed

## Internal deployment docs

- [PM2 single-server runbook](infrastructure/pm2/DEPLOYMENT.md)
- [Container deployment runbook](infrastructure/docker/DEPLOYMENT.md)
- [Infrastructure overview](infrastructure/README.md)

## Troubleshooting

### Frontend build warnings or failures on Windows

Move the repo to an `NTFS` path before running `next build`.

### Auth redirects or missing sessions

Check:

- API is reachable on `:3000`
- frontend env files point at the API origin, not an `/api/v1` suffix
- requests are going through the frontend rewrites
- cookies are not being blocked by cross-origin requests

### Seeded passwords do not work

The seed scripts load env-aware password hashing. If login breaks after env changes:

```bash
cd apps/api
npx prisma db seed
```

If you need a clean reset:

```bash
cd apps/api
npx prisma migrate reset --force
```
