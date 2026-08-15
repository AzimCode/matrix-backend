# ── Dependencies ────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
# Prisma's engines are native binaries that need OpenSSL even to be
# generated; without it the CLI misdetects the libssl version and falls
# back to a build that won't load at runtime.
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# ── Build ───────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build
# Keeps the prisma CLI: it is a runtime dependency here because the
# container runs `prisma migrate deploy` on startup.
RUN npm prune --omit=dev

# ── Runtime ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache openssl libc6-compat
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# --chown matters: the app runs as an unprivileged user, and the prisma CLI
# writes into node_modules/@prisma/engines when it verifies engines at
# startup. Root-owned files make `migrate deploy` fail with EACCES.
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main.js"]
