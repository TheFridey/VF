# VeteranFinder

VeteranFinder is a monorepo for a veteran reconnection platform with a public member app, a dedicated admin console, and a NestJS API.

## What is in this repo

```text
apps/web    Next.js member-facing app
apps/admin  Next.js admin console
apps/api    NestJS API + Prisma + tests
infrastructure/  Deployment and infrastructure docs
docs/       Product and project docs
scripts/    Shared repo scripts
coturn/     TURN server config for video features
nginx/      Reverse proxy config
```

## Architecture

```text
apps/web (:3001)  ----\
                       \--> apps/api (:3000) --> PostgreSQL (:5432)
apps/admin (:3002) --/                      \-> Redis (:6379)
```

Both frontend apps use `/api/*` rewrites to talk to the API. Authentication is cookie-based, with HttpOnly cookies set by the API.

## Current stack

- Node.js 20
- npm 10+
- Next.js 15.5.10
- React 18.3.1
- NestJS 10
- Prisma 5
- PostgreSQL 15
- Redis 7
- Playwright + Vitest + Jest

## Requirements

- Node.js `20.x`
- npm `10+`
- Docker Desktop
- PostgreSQL and Redis via Docker for local development

### Windows filesystem note

Direct `next build` runs on Windows require the repo to live on an `NTFS` volume.

This repo includes a guard script that blocks production Next.js builds on `exFAT` / `FAT32` and similar filesystems because of the known Windows `readlink` / `EISDIR` failure inside Next.js.

If you are on a non-NTFS drive:

```powershell
npm run build:web:docker
npm run build:admin:docker
```

Those Docker builds run correctly because they build inside Linux containers.

## Apps and local URLs

| Surface | URL | Notes |
| --- | --- | --- |
| API | `http://localhost:3000` | NestJS API |
| API docs | `http://localhost:3000/api/docs` | Swagger |
| Web app | `http://localhost:3001` | Member app |
| Admin app | `http://localhost:3002` | Admin console |
| Mailpit UI | `http://localhost:8025` | Local mail viewer |
| PostgreSQL | `localhost:5432` | Docker |
| Redis | `localhost:6379` | Docker |

## Quick start

### 1. Start local infrastructure

```powershell
docker-compose up -d
```

Default local services:

- PostgreSQL
- Redis
- Mailpit

Optional:

- `coturn` is available under the `video` Docker Compose profile.

### 2. Install dependencies

From the repo root:

```powershell
npm run install:apps
```

### 3. Create environment files

Minimum local files:

```text
apps/api/.env
apps/web/.env.local
apps/admin/.env.local
```

Suggested setup:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env.local
Set-Content apps\admin\.env.local "NEXT_PUBLIC_API_URL=http://localhost:3000"
```

### 4. Run Prisma setup

```powershell
cd apps\api
npx prisma generate
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the apps

In separate terminals:

```powershell
cd apps\api
npm run dev
```

```powershell
cd apps\web
npm run dev
```

```powershell
cd apps\admin
npm run dev
```

## Environment variables

### `apps/api/.env`

The API example file is the source of truth for local setup. Important variables include:

- `DATABASE_URL`
- `REDIS_HOST`
- `REDIS_PORT`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `COOKIE_SECRET`
- `ENCRYPTION_KEY`
- `PASSWORD_PEPPER`
- `FRONTEND_URL`
- `ADMIN_URL`
- `CLOUDINARY_*`
- `STRIPE_*`
- `RESEND_API_KEY`
- `APP_URL`
- `TURN_*`
- `VAPID_*`

### `apps/web/.env.local`

Minimum local values:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3002
```

Optional:

- `NEXT_PUBLIC_ENABLE_BIA`
- `NEXT_PUBLIC_ENABLE_MEMBERSHIP`
- analytics tokens

### `apps/admin/.env.local`

Minimum local value:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Root scripts

From the repo root:

| Command | Purpose |
| --- | --- |
| `npm run install:apps` | Install dependencies for all three apps |
| `npm run docker:up` | Start local Docker services |
| `npm run docker:down` | Stop local Docker services |
| `npm run docker:logs` | Tail Docker logs |
| `npm run dev:api` | Start API in watch mode |
| `npm run dev:web` | Start web app |
| `npm run dev:admin` | Start admin app |
| `npm run build:api` | Build API |
| `npm run build:web` | Build web app |
| `npm run build:admin` | Build admin app |
| `npm run build:web:docker` | Production-build web inside Docker |
| `npm run build:admin:docker` | Production-build admin inside Docker |
| `npm run typecheck` | Typecheck all apps |
| `npm run lint` | Lint all apps |
| `npm run build` | Build all apps |
| `npm run test:api` | API unit tests |
| `npm run test:api:e2e` | API e2e tests |
| `npm run test:web` | Web unit tests |
| `npm run test:web:e2e` | Web Playwright tests |
| `npm run test:admin` | Admin unit tests |
| `npm run test:admin:e2e` | Admin Playwright tests |
| `npm run test:e2e` | API e2e + web e2e + admin e2e |
| `npm run test:all` | Full test surface |
| `npm test` | Alias for `npm run test:all` |

## App-level scripts

### `apps/api`

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:migrate:prod`
- `npm run prisma:seed`
- `npm run db:reset`

### `apps/web`

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:e2e:install`

### `apps/admin`

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test:unit`
- `npm run test:e2e`
- `npm run test:e2e:install`

## Testing

### API

```powershell
cd apps\api
npm run lint
npm run typecheck
npm run build
npm run test:unit
npm run test:e2e
```

### Web

```powershell
cd apps\web
npm run lint
npm run typecheck
npm run test
npm run test:e2e:install
npm run test:e2e
```

### Admin

```powershell
cd apps\admin
npm run lint
npm run typecheck
npm run test
npm run test:e2e:install
npm run test:e2e
```

### Production-container browser proof

When you need to validate the built Next.js apps instead of the dev servers:

```powershell
npm run build:web:docker
npm run build:admin:docker
```

Then run containers and point Playwright at them with `PLAYWRIGHT_BASE_URL`.

The repo is configured so external container Playwright runs use a safer single-worker mode.

## Auth model

VeteranFinder does not rely on browser-stored auth tokens.

Flow:

1. frontend submits login to `/api/auth/login`
2. API sets HttpOnly cookies
3. later requests include cookies automatically
4. frontend state stores the user profile only

Implications:

- use the frontend rewrites instead of calling the API directly from the browser
- cookie behavior matters for route protection and redirects
- both Next.js apps are designed around same-origin browser requests

## Seed data

The seed script is at [apps/api/prisma/seed.ts](/d:/Downloads/vf/apps/api/prisma/seed.ts).

Useful seeded accounts include:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@veteranfinder.com` | `Admin123!@#` |
| Moderator | `moderator@veteranfinder.com` | `Moderator123!@#` |
| Veteran | `john.doe@example.com` | `Password123!` |
| Veteran | `sarah.smith@example.com` | `Password123!` |
| Veteran | `marcus.williams@example.com` | `Password123!` |

The seed also creates:

- verification requests
- BIA forum categories and starter threads
- example message conversations
- reports and moderation data
- blocks
- audit logs

Treat the seed file as the source of truth if any of the sample accounts change.

## Builds

### Local builds

API builds normally on all supported platforms:

```powershell
npm run build --prefix apps/api
```

Frontend production builds:

- work directly on macOS, Linux, WSL, and Windows on `NTFS`
- are intentionally blocked on unsupported Windows filesystems by [scripts/check-next-build-env.js](/d:/Downloads/vf/scripts/check-next-build-env.js)

### Docker builds

Frontend production images are built from the repo root:

```powershell
docker build -t veteranfinder-web-build -f apps/web/Dockerfile .
docker build -t veteranfinder-admin-build -f apps/admin/Dockerfile .
```

The Dockerfiles are aligned with the current Next.js 15 standalone output layout.

## CI and deployment

Current workflow files:

- [.github/workflows/ci.yml](/d:/Downloads/vf/.github/workflows/ci.yml)
- [.github/workflows/deploy.yml](/d:/Downloads/vf/.github/workflows/deploy.yml)

At a high level:

- CI installs dependencies per app
- CI runs lint, typecheck, unit tests, browser tests, API e2e, builds, and audits
- deploy is image-based and SSH-driven

For the deployment runbook, use:

- [infrastructure/docker/DEPLOYMENT.md](/d:/Downloads/vf/infrastructure/docker/DEPLOYMENT.md)
- [infrastructure/README.md](/d:/Downloads/vf/infrastructure/README.md)

## Makefile

For Linux, macOS, and WSL users:

```text
make setup
make dev-up
make dev-down
make api
make web
make admin
make typecheck
make lint
make build
make db-migrate
make db-seed
make db-reset
```

## Troubleshooting

### `next build` fails on Windows

If you see a message about unsupported Windows filesystems or the older Next.js `readlink` / `EISDIR` failure:

- move the repo to an `NTFS` path
- reinstall dependencies
- retry the build

Or use Docker:

```powershell
npm run build:web:docker
npm run build:admin:docker
```

### Auth loops or redirects feel wrong

Check:

- API is running on `:3000`
- `NEXT_PUBLIC_API_URL` points at the API origin
- `FRONTEND_URL` and `ADMIN_URL` match the browser origins
- requests go through the frontend `/api/*` rewrites
- cookies are not being blocked by cross-origin access

### Seeded passwords do not work

The seed script manually loads env files so `PASSWORD_PEPPER` matches runtime behavior. If local login breaks after env changes:

```powershell
cd apps\api
npx prisma db seed
```

If needed, reset and reseed:

```powershell
cd apps\api
npx prisma migrate reset --force
```

### Local email testing

Use Mailpit:

- SMTP: `localhost:1025`
- UI: `http://localhost:8025`

## Recommended dev flow

```text
1. docker-compose up -d
2. npm run install:apps
3. set up env files
4. cd apps/api && npx prisma migrate dev && npx prisma db seed
5. run api, web, and admin in separate terminals
6. run typecheck, lint, and tests before pushing
```

## Notes

- The dedicated admin console is `apps/admin`.
- The frontend apps are on a patched Next.js 15 line.
- Root `npm test` is intentionally the full-repo test surface.
- Web lint currently passes with a small number of existing `next/image` performance warnings.
