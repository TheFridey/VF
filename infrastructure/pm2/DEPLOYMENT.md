# VeteranFinder PM2 Deployment Runbook

Use this runbook when the target host runs VeteranFinder directly with `nginx + pm2` instead of Docker.

## Runtime layout

- API on `127.0.0.1:3000`
- Web on `127.0.0.1:3001`
- Admin on `127.0.0.1:3002`
- `nginx` terminates TLS and reverse-proxies public traffic

## First-time setup

### 1. Clone the repo

```bash
git clone https://github.com/<org>/VF.git /var/www/vf
cd /var/www/vf
```

### 2. Install app dependencies

```bash
npm run install:apps
```

### 3. Create env files

Required files:

```text
apps/api/.env
apps/web/.env.local
apps/admin/.env.local
```

Minimum frontend examples:

```dotenv
# apps/web/.env.local
NEXT_PUBLIC_API_URL=https://veteranfinder.co.uk
NEXT_PUBLIC_SITE_URL=https://veteranfinder.co.uk

# apps/admin/.env.local
NEXT_PUBLIC_API_URL=https://veteranfinder.co.uk
```

Do not point frontend env vars at `/api` or `/api/v1` paths. Use the origin only.

### 4. Prepare the database

```bash
cd /var/www/vf/apps/api
npx prisma generate
npx prisma migrate deploy
```

### 5. Build the apps

```bash
cd /var/www/vf
npm run build:api
npm run build:web
npm run build:admin
```

### 6. Start processes with PM2

```bash
pm2 start npm --name vf-api --cwd /var/www/vf/apps/api -- start
pm2 start npm --name vf-web --cwd /var/www/vf/apps/web -- start
pm2 start npm --name vf-admin --cwd /var/www/vf/apps/admin -- start
pm2 save
```

## Deploying updates

### Full application deploy

```bash
cd /var/www/vf
git pull origin main
npm run install:apps

cd /var/www/vf/apps/api
npx prisma migrate deploy

cd /var/www/vf
npm run build:api
npm run build:web
npm run build:admin

pm2 restart vf-api --update-env
pm2 restart vf-web --update-env
pm2 restart vf-admin --update-env
```

### Admin-only deploy

```bash
cd /var/www/vf
git pull origin main

cd /var/www/vf/apps/admin
rm -rf .next
npm install
npm run build

pm2 restart vf-admin --update-env
```

### API-only deploy

```bash
cd /var/www/vf
git pull origin main

cd /var/www/vf/apps/api
npx prisma migrate deploy
npm run build

pm2 restart vf-api --update-env
```

## Nginx

The repo-managed config lives at [`../../nginx/veteranfinder.conf`](../../nginx/veteranfinder.conf).

Install or refresh it with:

```bash
cp /var/www/vf/nginx/veteranfinder.conf /etc/nginx/sites-available/veteranfinder
ln -sf /etc/nginx/sites-available/veteranfinder /etc/nginx/sites-enabled/veteranfinder
nginx -t
systemctl reload nginx
```

## Operational checks

```bash
pm2 status
pm2 logs vf-api --lines 50
pm2 logs vf-web --lines 50
pm2 logs vf-admin --lines 50

curl -I http://127.0.0.1:3000/api/v1/health
curl -I http://127.0.0.1:3001
curl -I http://127.0.0.1:3002
```

## Notes

- The web and admin apps use standalone Next.js output under PM2, not `next start`.
- The admin starter also syncs standalone static assets before boot so chunk loading stays stable after deploys.
- If you are only seeding blog posts on a live database, use `npm run prisma:seed:blog --prefix apps/api` instead of the full demo seed.
