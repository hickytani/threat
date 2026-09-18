# ThreatSync OS Production Multi-Stage Container Definition
# Targets: api, worker, web

# ----------------------------------------------------------------------
# 1. Base Setup
# ----------------------------------------------------------------------
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

# ----------------------------------------------------------------------
# 2. Dependencies
# ----------------------------------------------------------------------
FROM base AS dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/shared-types/package.json packages/shared-types/
RUN npm ci

# ----------------------------------------------------------------------
# 3. Builder
# ----------------------------------------------------------------------
FROM dependencies AS builder
COPY . .
# Generate database client first
RUN npm run db:generate
# Build all workspaces
RUN npm run build --workspaces --if-present

# ----------------------------------------------------------------------
# 4. Production API Runner
# ----------------------------------------------------------------------
FROM node:20-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001

COPY --from=builder --chown=node:node /app /app
USER node

EXPOSE 3001
CMD ["npm", "run", "start:api"]

# ----------------------------------------------------------------------
# 5. Production BullMQ Background Worker Runner
# ----------------------------------------------------------------------
FROM node:20-alpine AS worker
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder --chown=node:node /app /app
USER node

CMD ["npm", "run", "start:worker"]

# ----------------------------------------------------------------------
# 6. Production Web (Next.js) Runner
# ----------------------------------------------------------------------
FROM node:20-alpine AS web
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder --chown=node:node /app /app
USER node

EXPOSE 3000
CMD ["npm", "run", "start:web"]
