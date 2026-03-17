FROM node:20-alpine AS builder

WORKDIR /app/apps/web

ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3001
ARG NEXT_PUBLIC_ADMIN_APP_URL=http://localhost:3002

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_ADMIN_APP_URL=$NEXT_PUBLIC_ADMIN_APP_URL
ENV NODE_OPTIONS="--max-old-space-size=1536"

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY scripts /app/scripts
COPY apps/web ./

RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=512"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
