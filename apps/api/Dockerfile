# Build stage
FROM --platform=linux/arm64 node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./
COPY prisma ./prisma/

# Install all dependencies (including dev for build)
RUN npm install --legacy-peer-deps

# Generate Prisma client
RUN npx prisma generate

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM --platform=linux/arm64 node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy package files and install production dependencies
COPY package.json ./
COPY prisma ./prisma/

RUN npm install --omit=dev --legacy-peer-deps && \
    npx prisma generate && \
    npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nestjs:nodejs /app

USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
