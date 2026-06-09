FROM node:20-alpine AS base
RUN apk add --no-cache ffmpeg python3 make g++
RUN npm install -g pnpm@9

WORKDIR /app

# ── Dependencies ───────────────────────────────────────────────────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile

# ── Builder ────────────────────────────────────────────────────────────────────
FROM deps AS builder
COPY . .
RUN pnpm --filter @wacs/api exec prisma generate
RUN pnpm --filter @wacs/api build

# ── Production image ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache ffmpeg wget
RUN npm install -g pnpm@9

WORKDIR /app

ENV NODE_ENV=production
ENV FFMPEG_PATH=/usr/bin/ffmpeg
ENV FFPROBE_PATH=/usr/bin/ffprobe
ENV PORT=3001
ENV API_PORT=3001

# Create storage dirs BEFORE switching user
RUN mkdir -p storage/uploads storage/output storage/temp logs && \
    addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 wacs && \
    chown -R wacs:nodejs /app

USER wacs

COPY --from=builder --chown=wacs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=wacs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=wacs:nodejs /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder --chown=wacs:nodejs /app/apps/api/prisma ./prisma
COPY --from=builder --chown=wacs:nodejs /app/packages ./packages

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3001/health || exit 1

CMD ["node", "dist/index.js"]
