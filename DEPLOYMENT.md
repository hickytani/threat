# ThreatSync OS — Deployment & Production Engineering Guide

This guide provides the official deployment contract, production environment specifications, health check monitoring standards, and operational deployment procedures for ThreatSync OS.

---

## 1. Deployment Architecture

ThreatSync OS is structured as a decoupled monorepo supporting standard Node.js cloud hosting targets (e.g. Vercel / AWS Amplify / Railway for Next.js web frontend, AWS ECS / Render / Railway / Heroku for NestJS API backend, AWS RDS / Managed PostgreSQL for database, AWS ElastiCache / Redis Cloud for production queue processing).

```text
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (SOC Console)                │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST APIs
┌──────────────────────────────▼──────────────────────────────┐
│                    Next.js Web Frontend                     │
│               (Node.js App Router Server / CDN)              │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JWT Session Cookies
┌──────────────────────────────▼──────────────────────────────┐
│                     NestJS API Backend                      │
│             (REST Controllers, Guards, Services)            │
└──────────────┬──────────────────────────────┬───────────────┘
               │                              │
               │ Prisma ORM                   │ ioredis / BullMQ
┌──────────────▼──────────────┐┌──────────────▼──────────────┐
│    Managed PostgreSQL 18    ││     Managed Redis Cluster    │
│    (Primary Relational DB)  ││    (Production Telemetry    │
│                             ││       Queue Broker)          │
└─────────────────────────────┘└──────────────────────────────┘
```

---

## 2. Environment Variables Contract

Copy `.env.example` to `.env` in production and configure values according to this matrix:

### REQUIRED (Production & Staging)

| Variable | Description | Example / Recommended Value |
|---|---|---|
| `NODE_ENV` | Runtime mode | `production` |
| `PORT` | API server listen port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@db-host:5432/threatsync?schema=public&sslmode=require` |
| `REDIS_URL` | Redis connection URI (Mandatory in prod) | `rediss://default:pass@redis-host:6379` |
| `JWT_SECRET` | 32+ byte secret for signing access JWTs | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | 32+ byte secret for refresh JWTs | `openssl rand -base64 48` |
| `SESSION_SECRET` | 16+ byte key for session encryption | `openssl rand -base64 32` |
| `INTEGRATION_ENCRYPTION_KEY` | 32-byte secret for AES-256-GCM integration key encryption | `openssl rand -base64 32` |

### OPTIONAL (External Threat Intelligence & Webhooks)

| Variable | Description | Behavior When Omitted |
|---|---|---|
| `VIRUSTOTAL_API_KEY` | VirusTotal v3 API Key | Provider returns `UNAVAILABLE` state (`API key not configured`) |
| `ABUSEIPDB_API_KEY` | AbuseIPDB v2 API Key | Provider returns `UNAVAILABLE` state (`API key not configured`) |

### DEVELOPMENT ONLY

| Variable | Description | Production Constraint |
|---|---|---|
| `ENABLE_IN_MEMORY_QUEUE_FALLBACK` | Allows Redis-free local execution | **Must be false / unset in production**. Production code fails startup if `REDIS_URL` is missing and fallback is enabled. |

---

## 3. Database Migration Deployment Workflow

In production, database schema changes must be applied using non-destructive migration deployments:

```bash
# Generate Prisma Client artifacts
npm run db:generate

# Deploy pending database migrations safely to production DB
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma

# Verify migration status
npx prisma migrate status --schema packages/database/prisma/schema.prisma
```

> **IMPORTANT**: Never run `npx prisma db push` or `prisma migrate reset` against production database instances.

---

## 4. Production Queue & Startup Boundary

ThreatSync OS enforces strict infrastructure boundary checks during NestJS application startup:

1. **Development Mode**: `ENABLE_IN_MEMORY_QUEUE_FALLBACK=true` allows running the queue worker asynchronously in-memory.
2. **Production Mode (`NODE_ENV=production`)**: `REDIS_URL` is mandatory. `QueueService` tests connection to Redis at startup. If `REDIS_URL` is missing or connection fails, the process exits with `PRODUCTION BOUNDARY VIOLATION`.

---

## 5. Health & Readiness Observability Endpoints

The API exposes three health monitoring endpoints for load balancers and container orchestrators:

- **`GET /api/v1/health/live`**: Process liveness probe. Returns HTTP 200 `{ status: 'healthy' }`.
- **`GET /api/v1/health/ready`**: Application readiness probe. Tests live PostgreSQL connection and Redis connection. Returns HTTP 200 `{ status: 'ready', redis: 'connected' }` or HTTP 533 `{ status: 'not_ready', error: '...' }`.
- **`GET /api/v1/health/dependencies`**: Detailed dependency status report (`database: 'UP'`, `redis: 'UP' | 'DOWN' | 'UP (In-memory Fallback)'`).

---

## 6. Backup & Recovery Operations

- **PostgreSQL**: Daily automated snapshot backup required. Configure Point-In-Time Recovery (PITR) with a 30-day retention window on managed DB provider (e.g. AWS RDS / Neon).
- **Redis Queue**: Queue jobs are transient telemetry. Redis persistence (`RDB` or `AOF`) is recommended to ensure queue job recovery across instance restarts.
- **Secrets Backup**: Store `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET`, and `INTEGRATION_ENCRYPTION_KEY` in AWS Secrets Manager or HashiCorp Vault.

---

## 7. Known Infrastructure Limitations (Honest Verification Status)

| Infrastructure Component | Status | Details |
|---|---|---|
| **Local PostgreSQL 18** | **VERIFIED LOCALLY** | Verified with live database queries and Supertest E2E suite. |
| **In-Memory Queue Fallback** | **VERIFIED LOCALLY** | Verified with live local PostgreSQL event pipeline execution. |
| **Production Redis / BullMQ Daemon** | **NOT VERIFIED** | Production startup check unit-tested; live Redis server daemon process not running locally. |
| **Live External Threat Intel API** | **NOT VERIFIED** | Provider abstraction unit-tested; live API keys not supplied in local test environment. |
| **Live External Webhooks** | **NOT VERIFIED** | Webhook payload generation and SSRF validation unit-tested; live external server delivery not executed. |
| **TLS / HTTPS Termination** | **NOT VERIFIED** | Production TLS expected to be terminated by cloud reverse proxy (e.g. Nginx, Cloudflare, ALB). |
