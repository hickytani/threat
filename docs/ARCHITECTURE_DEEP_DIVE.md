# ThreatSync OS — Comprehensive Architecture Deep Dive

ThreatSync OS is structured as a modern multi-tenant monorepo combining a high-performance NestJS backend, Prisma ORM database persistence layer, BullMQ/Redis asynchronous event pipeline, and a Next.js 14 App Router analyst investigation console.

---

```
                       ARCHITECTURE AT A GLANCE
                       
  [ Next.js 14 Web Console ]
             │
             ▼ (Typed REST API Client)
  [ NestJS API Gateway & Domain Services ] ──► [ TenantGuard / JWT Auth ]
             │
             ├─── Sync Path ───► [ Prisma ORM ] ──► [ PostgreSQL DB ]
             │
             └─── Async Path ──► [ BullMQ Queue ] ──► [ Redis Boundary ]
                                       │
                                       ▼
                                [ Idempotent Worker ]
                                       │
                                       ▼
                       [ Detection / Correlation Engine ]
```

---

### 1. Frontend Architecture (`apps/web`)

- **Framework**: Next.js 14 using App Router and Server/Client Components.
- **Centralized API Client**: `apps/web/lib/api-client.ts` wraps fetch requests with cookie/JWT attachment and standardized error handling (`ApiClientError`). Tenant scope is established by the authenticated session and enforced server-side.
- **Shared Types**: Shared TypeScript contracts imported directly from `packages/shared-types`, ensuring zero drift between backend DTOs and frontend components.
- **Investigation Views**: Specialized investigation consoles for Alerts (`/dashboard/alerts/[id]`), Incidents (`/dashboard/incidents/[id]`), Assets (`/dashboard/assets/[id]`), and IOCs (`/dashboard/ioc/[id]`).

---

### 2. Backend API Layer (`apps/api`)

- **Framework**: NestJS (Node.js) with modular domain separation (`auth`, `events`, `detection`, `correlation`, `assets`, `incidents`, `queues`, `intelligence`, `audit`).
- **Authentication & Authorization**: JWT token validation paired with `TenantGuard` and `RolesGuard`. Context is bound to incoming request scope.
- **Validation**: Global `ValidationPipe` enforcing `class-validator` rules on incoming DTOs.
- **Health Probes**: Liveness (`/api/v1/health/live`) and readiness (`/api/v1/health/ready`), with readiness dynamically testing database and Redis connection boundaries.

---

### 3. Persistence & Tenant Isolation (`packages/database`)

- **ORM**: Prisma ORM with PostgreSQL backend schema (`schema.prisma`).
- **Tenant Isolation Pattern**: Tenant-aware services resolve the active organization from the authenticated request and include `organizationId` in each Prisma query. The repository uses explicit organization keys rather than a database-wide implicit tenant column.
- **Indexes**: Prisma indexes are scoped to actual query patterns, including organization plus timestamp, asset, event type, source IP, status, and integration provenance.

---

### 4. Asynchronous Pipeline & Redis Boundary (`apps/api/src/queues`)

- **Queue Engine**: BullMQ on Redis.
- **Ingestion Decoupling**: REST API validates events and pushes structured jobs into the `telemetry-ingestion` BullMQ queue for async processing.
- **Worker Hardening**: `QueueWorker` processes events asynchronously with exponential backoff retries, dead-letter queue routing on repeated failures, and deterministic job ID deduplication.
- **Production Guard**: Strict environment validation forces real Redis connections in production (`NODE_ENV=production`), refusing fallback to mock drivers.

---

### 5. Detection & Correlation Engines

- **Detection**: `EventPipelineService` matches normalized event attributes against explicit rules and supported operators. Matched rules generate structured Alert entities with matched evidence.
- **Correlation**: `CorrelationService` aggregates active alerts into unified Incident objects based on shared asset IDs, identities, network indicators, malicious IOC matches, and a 1-hour temporal window.

---

### 6. Audit & State Transitions (`apps/api/src/audit`)

- **State Transitions**: Incident status changes follow backend-authoritative transitions defined in `incidents.service.ts`.
- **Audit Logging**: Domain services write audit records for ingestion, detection, correlation, integration actions, and investigation operations with actor, action, timestamp, entity ID, and state metadata.
