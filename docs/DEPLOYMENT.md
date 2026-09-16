# Deployment

## Logical Services

The intended production topology contains:

```text
Next.js web -> NestJS API -> PostgreSQL
                     |\
                     | Redis/BullMQ worker
                     |\
                     +-> optional external intelligence providers
```

The current queue worker is initialized by the API application. Run it as a separate process only after adding an explicit worker bootstrap that shares the queue module without opening HTTP routes.

## Required Production Variables

```env
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://app.example.com
NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
ENABLE_IN_MEMORY_QUEUE_FALLBACK=false
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<different-strong-random-secret>
SESSION_SECRET=<different-strong-random-secret>
AI_PROVIDER=mock
ALLOW_DEMO_SEED=false
```

Use provider-specific API keys only when that provider is intentionally enabled. Never commit or expose these values to the browser.

## Database

For a new production database:

```bash
npm ci
npm run db:generate
npx prisma migrate deploy --schema packages/database/prisma/schema.prisma
npm run build --workspace=apps/api
```

The repository now contains a baseline migration including the ingestion credential model. Existing databases with no migration history require a deliberate Prisma baseline/adoption procedure; do not run a reset against customer data. Local development can use:

```bash
npm run db:push
```

Never run `npm run db:seed` as part of production startup.

## Start Commands

```bash
npm run start:prod --workspace=apps/api
npm run start --workspace=apps/web
```

The web host must set `NEXT_PUBLIC_API_URL` at build time. The API host must allow the exact `FRONTEND_URL` with credentials.

## Health Checks

- Liveness: `GET /api/v1/health/live`
- Readiness: `GET /api/v1/health/ready`
- Dependency status: `GET /api/v1/health/dependencies`

Readiness requires the database and, in production, real Redis. A mock queue must not be reported as production-ready.

## Pre-Launch Verification

```bash
npm test --workspaces --if-present -- --runInBand
npm run build --workspaces --if-present
git diff --check
git status
```

Then verify registration, clean organization state, credential creation, authenticated ingestion, duplicate behavior, alert/incident processing, tenant isolation, credential revocation, and restart persistence against a non-demo production-like database.

## Remaining Deployment Work

A public launch still needs CI/CD, managed PostgreSQL and Redis, secret rotation, distributed/edge rate limiting, backups, centralized logs/metrics, a separate worker entrypoint, and an independent security review of the chosen hosting topology.
