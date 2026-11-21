# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS deps
WORKDIR /app
# better-sqlite3 ships prebuilt binaries; the toolchain is a fallback for unusual platforms.
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/data/velo.db

RUN groupadd --system --gid 1001 velo \
  && useradd --system --uid 1001 --gid velo velo \
  && mkdir -p /data && chown velo:velo /data

COPY --from=builder --chown=velo:velo /app/.next/standalone ./
COPY --from=builder --chown=velo:velo /app/.next/static ./.next/static
COPY --from=builder --chown=velo:velo /app/public ./public

USER velo
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
