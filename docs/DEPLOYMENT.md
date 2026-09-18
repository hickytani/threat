# ThreatSync OS — Production Deployment Guide

This guide details the complete procedure for building, migrating, running, and managing ThreatSync OS in production.

---

## 1. System Architecture & Topology

```text
Internet / Clients
        │
        ▼ (HTTPS / Port 443)
┌─────────────────────────────────────────────────────────┐
│              Reverse Proxy / Load Balancer              │
│       (NGINX / AWS ALB / Cloudflare / Traefik)          │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
   / (Web UI)  │                          │  /api/v1 (REST & Webhooks)
               ▼                          ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│      Next.js Web         │   │       NestJS API         │
│     (Node 20 / :3000)    │   │     (Node 20 / :3001)    │
└──────────────────────────┘   └──────────┬───────────────┘
                                          │
                        ┌─────────────────┴─────────────────┐
                        │                                   │
                        ▼                                   ▼
          ┌──────────────────────────┐        ┌──────────────────────────┐
          │  PostgreSQL 16 Database  │        │   Redis 7 / BullMQ Queue │
          │ (State, Audit, Telemetry)│        │   (Async Ingestion Queue)│
          └──────────────────────────┘        └─────────────┬────────────┘
                                                            │
                                                            ▼
                                              ┌──────────────────────────┐
                                              │      BullMQ Worker       │
                                              │  (Background Ingestion)  │
                                              └──────────────────────────┘
```

---

## 2. Production Deployment Steps

### Step 1: Provision Infrastructure
- **PostgreSQL 16+**: Provision a managed database (e.g. AWS RDS PostgreSQL, GCP Cloud SQL).
- **Redis 7+**: Provision a managed Redis instance (e.g. AWS ElastiCache).

### Step 2: Environment Configuration
Create environment files or set process variables per [`PRODUCTION_CONFIGURATION.md`](./PRODUCTION_CONFIGURATION.md).

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgresql://threatsync_user:STRONG_PASSWORD@postgres.internal:5432/threatsync?schema=public
REDIS_URL=redis://redis.internal:6379
ENABLE_IN_MEMORY_QUEUE_FALLBACK=false

JWT_SECRET=c3f81e90d2a45b67890123456789abcdef0123456789abcdef0123456789abcd
JWT_REFRESH_SECRET=7f8e9d0c1b2a34567890123456789abcdef0123456789abcdef0123456789a
SESSION_SECRET=a1b2c3d4e5f67890123456789abcdef0

FRONTEND_URL=https://app.threatsync.io
NEXT_PUBLIC_API_URL=https://api.threatsync.io/api/v1
ALLOW_DEMO_SEED=false
```

### Step 3: Run Database Migrations
**DO NOT USE `prisma db push` IN PRODUCTION.**

Execute standard Prisma migration deployment:

```bash
npm ci
npm run db:generate
npm run db:migrate
```

This applies baseline migrations from `packages/database/prisma/migrations` safely against the target PostgreSQL schema.

### Step 4: Multi-Stage Container Build & Start

Build container using production `Dockerfile`:

```bash
docker build -t threatsync/app:v1.0.0 .
```

Start container services:

```bash
# API Service
docker run -d --name threatsync-api \
  --env-file .env.production \
  -p 3001:3001 \
  threatsync/app:v1.0.0 npm run start:prod --workspace=apps/api

# Web Frontend Service
docker run -d --name threatsync-web \
  --env-file .env.production \
  -p 3000:3000 \
  threatsync/app:v1.0.0 npm run start --workspace=apps/web
```

Or run via Docker Compose:

```bash
docker-compose up -d --build
```

---

## 3. Production Health Monitoring

Health endpoints for load balancer and orchestration checks:

- **Liveness probe**: `GET /api/v1/health/live` (Returns `200 OK`)
- **Readiness probe**: `GET /api/v1/health/ready` (Returns `200 OK` if DB is connected & Redis is reachable)
- **Dependencies probe**: `GET /api/v1/health/dependencies` (Returns breakdown of DB & Redis status)

---

## 4. PostgreSQL Database Backup & Disaster Recovery Strategy

1. **Daily Automated Snapshots**: Configure cloud database provider for continuous point-in-time recovery (PITR) with a minimum 30-day retention window.
2. **Logical Backups (`pg_dump`)**: Schedule nightly encrypted `pg_dump` exports stored in off-site object storage (AWS S3 Glacier / GCP Coldline):
   ```bash
   pg_dump -h postgres.internal -U threatsync_user -d threatsync --format=custom --file=threatsync_backup_$(date +%Y%m%d).dump
   ```
3. **Migration Rollbacks**: Always create a snapshot prior to applying schema migrations (`npm run db:migrate`). Test restore procedures on a staging copy quarterly.
