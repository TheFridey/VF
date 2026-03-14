# ── Build stage ───────────────────────────────────────────────────────────────
# No --platform flag: builds correctly on ARM64 (dev) and amd64 (production).
FROM node:20-alpine AS builder

WORKDIR /app

# Limit Node memory during SSR build — prevents OOM on constrained build hosts
ENV NODE_OPTIONS="--max-old-space-size=1536"

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY . .

# Output: standalone mode (set in next.config.js output: 'standalone')
RUN npm run build

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
# Memory cap for production Next.js server — generous for a shared VPS
ENV NODE_OPTIONS="--max-old-space-size=512"

# Non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output — no node_modules in the image
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
