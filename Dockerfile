# ThreatSync OS Production Multi-Stage Container Definition

FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-libc-dev gcc make python3

# Install dependencies
FROM base AS dependencies
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/shared-types/package.json packages/shared-types/
RUN npm ci

# Build shared types & applications
FROM dependencies AS builder
COPY . .
RUN npm run build --workspaces --if-present

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app /app

EXPOSE 3000 3001
CMD ["npm", "start", "--workspace=api"]
