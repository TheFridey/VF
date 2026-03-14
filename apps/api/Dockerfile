# ── Build stage ───────────────────────────────────────────────────────────────
# No --platform flag: let Docker BuildKit use the target platform automatically.
# This builds correctly on both ARM64 (Apple Silicon dev) and amd64 (production VPS).
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev — needed for nest build)
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# ── Production stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# dumb-init: proper PID 1 signal handling, clean container shutdown
RUN apk add --no-cache dumb-init wget

# Non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files and install production-only dependencies
COPY package.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev --legacy-peer-deps && \
    npx prisma generate && \
    npm cache clean --force

# Copy compiled application from builder stage
COPY --from=builder /app/dist ./dist

RUN chown -R nestjs:nodejs /app

USER nestjs

EXPOSE 3000

# ── Health check ──────────────────────────────────────────────────────────────
# Must include the /api/v1 global prefix set in main.ts via app.setGlobalPrefix.
# Previously pointed at /health which returned 404 — the correct path is:
#   /api/v1/health (no auth guard — decorated with @Public())
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
