# syntax=docker/dockerfile:1

ARG NODE_VERSION=22-alpine

FROM node:${NODE_VERSION} AS base

ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app


# ---------------------------------------------------------------------------
# Development image: sources are bind-mounted, node_modules lives in a volume.
# ---------------------------------------------------------------------------
FROM base AS dev

ENV NODE_ENV=development

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/ ./

EXPOSE 3000
CMD ["npm", "run", "dev"]


# ---------------------------------------------------------------------------
# Production build: compiled to a self-contained standalone server.
# ---------------------------------------------------------------------------
FROM base AS builder

COPY apps/web/package.json apps/web/package-lock.json ./
RUN npm ci

COPY apps/web/ ./

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
RUN npm run build


FROM base AS prod

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0

COPY --from=builder /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node

EXPOSE 3000
CMD ["node", "server.js"]

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=5 \
    CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
