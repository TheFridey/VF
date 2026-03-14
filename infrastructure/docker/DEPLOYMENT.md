# VeteranFinder — Production Deployment Runbook

## Server: Coventry VPS (8 vCPU AMD Ryzen AM5, 16GB DDR5, 200GB NVMe, ~£28/mo)
## Stack:  NestJS API · Next.js web · Next.js admin · PostgreSQL · Redis · nginx · coturn

---

## Prerequisites (one-time, already done)

```bash
# Ubuntu 24.04 — install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# nginx
sudo apt install -y nginx certbot python3-certbot-nginx

# SSL for all three domains
sudo certbot --nginx -d veteranfinder.co.uk -d www.veteranfinder.co.uk -d admin.veteranfinder.co.uk
```

---

## First-time deployment

```bash
# 1. Clone the repo
git clone git@github.com:yourusername/veteranfinder.git /opt/veteranfinder
cd /opt/veteranfinder

# 2. Create environment file
cp apps/api/.env.example .env
nano .env   # Fill in all secrets (see REQUIRED SECRETS below)

# 3. Copy nginx config
sudo cp nginx/veteranfinder.conf /etc/nginx/sites-available/veteranfinder
sudo ln -s /etc/nginx/sites-available/veteranfinder /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 4. Build and start all services
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env up -d --build

# 5. Wait for API health check to pass (usually ~20s)
watch docker compose -f infrastructure/docker/docker-compose.yml ps

# 6. Run database migrations
docker exec veteranfinder-api npx prisma migrate deploy

# 7. Seed initial data (first deployment only)
docker exec veteranfinder-api npx ts-node -r tsconfig-paths/register prisma/seed.ts

# 8. Verify all services healthy
curl https://veteranfinder.co.uk/api/v1/health/ready
# Expected: {"status":"ready","checks":{"database":true,"redis":true},...}
```

---

## Subsequent deployments (rolling update)

```bash
cd /opt/veteranfinder

# 1. Pull latest code
git pull origin main

# 2. Rebuild and restart only changed services
docker compose -f infrastructure/docker/docker-compose.yml --env-file .env up -d --build api web admin

# 3. Run any pending migrations
docker exec veteranfinder-api npx prisma migrate deploy

# 4. Confirm health
curl https://veteranfinder.co.uk/api/v1/health/ready
```

---

## Required secrets (in .env)

The following are **hard failures** if not set (Docker Compose exits with error):

| Variable | How to generate |
|---|---|
| `DB_PASSWORD` | `openssl rand -hex 24` |
| `REDIS_PASSWORD` | `openssl rand -hex 24` |
| `JWT_SECRET` | `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `openssl rand -base64 24 \| head -c 32` |
| `PASSWORD_PEPPER` | `openssl rand -hex 32` |
| `COOKIE_SECRET` | `openssl rand -hex 32` |

---

## Useful commands

```bash
# View all container statuses
docker compose -f infrastructure/docker/docker-compose.yml ps

# Follow API logs
docker logs veteranfinder-api -f --tail 100

# Follow all logs
docker compose -f infrastructure/docker/docker-compose.yml logs -f

# Open Prisma Studio (dev only — not on production)
docker exec -it veteranfinder-api npx prisma studio

# Postgres backup
docker exec veteranfinder-db pg_dump -U veteranfinder veteranfinder | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Redis CLI
docker exec -it veteranfinder-redis redis-cli -a $REDIS_PASSWORD

# Restart a single service
docker restart veteranfinder-api

# Scale down gracefully
docker compose -f infrastructure/docker/docker-compose.yml stop api && sleep 5 && docker compose up -d api
```

---

## coturn (video calls)

```bash
# Install coturn
sudo apt install -y coturn

# Copy config (edit external-ip= to your VPS public IP first)
sudo cp coturn/turnserver.conf /etc/coturn/turnserver.conf
sudo sed -i 's/# external-ip=/external-ip=YOUR_VPS_IP/' /etc/coturn/turnserver.conf
sudo sed -i "s/\${TURN_SECRET}/$TURN_SECRET/" /etc/coturn/turnserver.conf

# Open firewall ports
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp

# Start and enable
sudo systemctl enable coturn
sudo systemctl start coturn
```

---

## Health check endpoints

| Endpoint | What it checks |
|---|---|
| `GET /api/v1/health` | API process alive |
| `GET /api/v1/health/live` | Liveness (uptime) |
| `GET /api/v1/health/ready` | Database + Redis connectivity |

---

## Monitoring checklist post-deploy

- [ ] `curl https://veteranfinder.co.uk/api/v1/health/ready` returns `"status":"ready"`
- [ ] Login with `john.doe@example.com / Password123!` succeeds
- [ ] Brothers search returns results
- [ ] Admin panel loads at `https://admin.veteranfinder.co.uk`
- [ ] Verification queue visible in admin
- [ ] Stripe webhooks receiving (check Stripe dashboard)
- [ ] Email sending (trigger a forgot-password, check Resend dashboard)
