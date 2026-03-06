# VeteranFinder

Veteran reconnection and community platform for military veterans.

## Quick Start (Windows PowerShell)

### Prerequisites
- Node.js 20+
- Docker Desktop (running)

### 1. Start Infrastructure
```powershell
cd D:\Downloads\vf   # or wherever you extracted
docker-compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)
- Mailpit (port 8025)

### 2. Start API

Open a new terminal:
```powershell
cd D:\Downloads\vf\apps\api
npm install
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

API runs at: http://localhost:3000
Swagger docs: http://localhost:3000/api/docs

### 3. Start Web App

Open another terminal:
```powershell
cd D:\Downloads\vf\apps\web
npm install
npm run dev
```

Web app runs at: http://localhost:3001

## Test Accounts

After seeding, these accounts are available:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@veteranfinder.com | Admin123!@# |
| Moderator | moderator@veteranfinder.com | Moderator123!@# |
| Veteran | john.doe@example.com | Veteran123!@# |
| Veteran | jane.smith@example.com | Veteran123!@# |
| Civilian | bob.wilson@example.com | Password123! |

## Access Points

| Service | URL |
|---------|-----|
| Web App | http://localhost:3001 |
| API | http://localhost:3000/api/v1 |
| API Docs | http://localhost:3000/api/docs |
| Mailpit | http://localhost:8025 |

## Troubleshooting

### Docker issues
If `docker-compose up -d` fails:
1. Make sure Docker Desktop is running
2. Try `docker-compose down` then `docker-compose up -d`
3. If image pull fails, restart Docker Desktop

### Prisma issues
If migrations fail:
```powershell
npx prisma migrate reset --force
npx prisma db seed
```

### Port conflicts
- PostgreSQL: Change `5432:5432` in docker-compose.yml
- Redis: Change `6379:6379` in docker-compose.yml
- API: Change PORT in apps/api/.env
- Web: Use `npm run dev -- -p 3002`

## Tech Stack

**Backend:**
- NestJS
- Prisma ORM
- PostgreSQL
- Redis

**Frontend:**
- Next.js 14
- Tailwind CSS
- Zustand

## Features

- Brothers in Arms veteran reconnection
- Real-time messaging (encrypted)
- Veteran verification
- Admin moderation tools
- GDPR compliance
