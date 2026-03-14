# VeteranFinder

VeteranFinder is a multi-app platform for veteran reconnection, messaging, moderation, verification, and BIA community features.

## Overview

This repository contains three application surfaces plus local infrastructure:

```text
                    +----------------------+
                    |  apps/web            |
                    |  Public user app     |
                    |  Next.js :3001       |
                    +----------+-----------+
                               |
                               | /api/* rewrite
                               v
                    +----------------------+
                    |  apps/api            |
                    |  NestJS + Prisma     |
                    |  API :3000           |
                    +----+-----------+-----+
                         |           |
                         |           |
                         v           v
                +-------------+   +-------------+
                | PostgreSQL  |   | Redis       |
                | :5432       |   | :6379       |
                +-------------+   +-------------+

                    +----------------------+
                    |  apps/admin          |
                    |  Admin console       |
                    |  Next.js :3002       |
                    +----------+-----------+
                               |
                               | /api/* rewrite
                               v
                           apps/api
```

## Repository Layout

```text
vf/
|-- apps/
|   |-- api/              NestJS API, Prisma schema, seeds, tests
|   |-- web/              Main user-facing Next.js app
|   `-- admin/            Dedicated admin Next.js app
|-- infrastructure/       Docker, Terraform, Kubernetes docs/config
|-- coturn/               TURN server config
|-- nginx/                Reverse proxy config
|-- .github/workflows/    CI and deploy workflows
|-- docker-compose.yml    Local infrastructure stack
|-- Makefile              Convenience commands for Unix/WSL
`-- package.json          Root helper scripts
```

## Current Admin Surfaces

There are currently two admin entry points in the repo:

- `apps/admin` is the dedicated admin console on port `3002`.
- `apps/web/src/app/admin/*` is an embedded admin route set inside the main web app.

Both now use the same cookie-based auth model, but `apps/admin` is the cleaner isolated surface for day-to-day admin work.

## Requirements

- Node.js `20.x`
- npm `10+`
- Docker Desktop
- A repo location on an `NTFS` volume if you need to run `next build`

### Important Windows note

If this project is stored on `exFAT`, `FAT32`, or another non-NTFS filesystem, both Next.js apps can fail during build with errors like:

```text
EISDIR: illegal operation on a directory, readlink ... node_modules/next/dist/pages/_app.js
```

This repository is currently on `D:` and that drive is `exFAT`, which explains the build failure seen locally. If you need reliable `next build` behavior on Windows, move the repo to an `NTFS` path such as:

```text
C:\dev\vf
```

## Quick Start

### 1. Start infrastructure

From the repo root:

```powershell
docker-compose up -d
```

Services started by default:

```text
+----------------+--------+------------------------------+
| Service        | Port   | Purpose                      |
+----------------+--------+------------------------------+
| PostgreSQL     | 5432   | Primary relational database  |
| Redis          | 6379   | Cache / queues / sessions    |
| Mailpit SMTP   | 1025   | Local outbound mail capture  |
| Mailpit UI     | 8025   | Mail viewer                  |
+----------------+--------+------------------------------+
```

Optional:

- `coturn` is included in `docker-compose.yml` under the `video` profile.

### 2. Install app dependencies

From the repo root:

```powershell
npm run install:apps
```

Or install per app:

```powershell
cd apps\api   ; npm install
cd apps\web   ; npm install
cd apps\admin ; npm install
```

### 3. Prepare environment files

Minimum local setup:

```text
apps/api/.env
apps/web/.env.local
apps/admin/.env.local
```

Suggested starting point:

```powershell
Copy-Item apps\api\.env.example apps\api\.env
Copy-Item apps\web\.env.example apps\web\.env.local
```

`apps/admin` typically only needs `NEXT_PUBLIC_API_URL` if you are not using the default local API URL.

### 4. Generate Prisma client and seed the database

```powershell
cd apps\api
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

### 5. Run the apps

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

## Local URLs

```text
+----------------------+-----------------------------+
| Surface              | URL                         |
+----------------------+-----------------------------+
| API                  | http://localhost:3000       |
| API docs             | http://localhost:3000/api/docs
| Web app              | http://localhost:3001       |
| Admin app            | http://localhost:3002       |
| Mailpit UI           | http://localhost:8025       |
+----------------------+-----------------------------+
```

## Root Scripts

From the repo root:

```text
+-------------------+-----------------------------------------------+
| Command           | What it does                                  |
+-------------------+-----------------------------------------------+
| npm run install:apps | Install dependencies for api/web/admin     |
| npm run dev:api      | Start API in watch mode                    |
| npm run dev:web      | Start web app on :3001                     |
| npm run dev:admin    | Start admin app on :3002                   |
| npm run typecheck    | Run TypeScript checks across all apps      |
| npm run lint         | Run lint across all apps                   |
| npm run build        | Build api, web, and admin                  |
| npm run test         | Run API unit tests                         |
+-------------------+-----------------------------------------------+
```

## Makefile Targets

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
```

## Auth and Request Flow

The frontend apps use cookie-based auth:

```text
Browser
  |
  | 1. POST /auth/login
  v
Next.js app (/api/* rewrite)
  |
  | 2. Forwards to apps/api
  v
API sets HttpOnly cookies
  |
  | 3. Browser sends cookies automatically on later requests
  v
Protected routes and API clients work without storing tokens in JS
```

Key implications:

- `apps/web` and `apps/admin` both send requests with `withCredentials: true`.
- Browser-side requests should go through each app's `/api/*` rewrite, not directly to `localhost:3000`.
- Session state stored in Zustand is profile-only; credentials stay in cookies.

## Seed Accounts

The current seed file creates these useful starter accounts:

```text
+----------------+-----------------------------+------------------+
| Role           | Email                       | Password         |
+----------------+-----------------------------+------------------+
| Admin          | admin@veteranfinder.com     | Admin123!@#      |
| Moderator      | moderator@veteranfinder.com | Moderator123!@#  |
| Veteran        | john.doe@example.com        | Password123!     |
| Veteran        | sarah.smith@example.com     | Password123!     |
+----------------+-----------------------------+------------------+
```

If you change the seed logic, treat `apps/api/prisma/seed.ts` as the source of truth.

## Verification Status

Current repo checks after this cleanup:

```text
+----------------------+------------------------------+
| Check                | Status                       |
+----------------------+------------------------------+
| apps/api build       | Passing                      |
| apps/api lint        | Passing                      |
| apps/web typecheck   | Passing                      |
| apps/web lint        | Passing with warnings        |
| apps/admin typecheck | Passing                      |
| apps/admin lint      | Passing with warnings        |
| apps/web build       | Blocked on exFAT filesystem  |
| apps/admin build     | Blocked on exFAT filesystem  |
+----------------------+------------------------------+
```

## CI and Deploy

GitHub Actions now use the same package manager model as local development:

- `CI` installs each app with `npm ci`
- `CI` runs lint, typecheck, tests, and builds per app
- `Deploy` builds Docker images for:
  - `apps/api`
  - `apps/web`
  - `apps/admin`

Workflow files:

```text
.github/workflows/ci.yml
.github/workflows/deploy.yml
```

## Troubleshooting

### Next.js build fails with `EISDIR ... readlink ... _app.js`

Cause:

- The repo is on a non-NTFS filesystem, most commonly `exFAT`.

Fix:

1. Move the repository to an `NTFS` volume.
2. Reinstall app dependencies.
3. Retry `npm run build` in `apps/web` or `apps/admin`.

### Frontend auth loops back to login

Check:

- `NEXT_PUBLIC_API_URL`
- API is running on `:3000`
- Requests are going through the app rewrite (`/api/*`)
- Cookies are being set for the frontend origin

### Prisma seed/login mismatches

The seed script manually loads `.env.local` before `.env` so `PASSWORD_PEPPER` matches runtime behavior. If seeded passwords stop working, regenerate and reseed from `apps/api`.

### Mail testing

Use Mailpit:

```text
SMTP port: 1025
UI:        http://localhost:8025
```

## Recommended Development Flow

```text
1. docker-compose up -d
2. npm run install:apps
3. cd apps/api   && npm run dev
4. cd apps/web   && npm run dev
5. cd apps/admin && npm run dev
6. npm run typecheck
7. npm run lint
```

## Notes

- The repo is currently in a period of active structural cleanup.
- The dedicated admin app and embedded admin routes both exist today.
- If you want production-like Next builds on Windows, prioritise moving the repo off `exFAT`.
