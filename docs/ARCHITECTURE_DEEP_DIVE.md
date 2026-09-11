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
- **Centralized API Client**: [`apps/web/lib/api-client.ts`](file:///c:/Users/prasu/Downloads/threat/apps/web/lib/api-client.ts) wraps fetch requests with automatic JWT token attachment, tenant header propagation, and standardized error handling (`ApiClientError`).
- **Shared Types**: Shared TypeScript contracts imported directly from `packages/shared-types`, ensuring zero drift between backend DTOs and frontend components.
- **Investigation Views**: Specialized investigation consoles for Alerts (`/dashboard/alerts/[id]`), Incidents (`/dashboard/incidents/[id]`), Assets (`/dashboard/assets/[id]`), and IOCs (`/dashboard/ioc/[id]`).

---

### 2. Backend API Layer (`apps/api`)

- **Framework**: NestJS (Node.js) with modular domain separation (`auth`, `events`, `detection`, `correlation`, `assets`, `incidents`, `queues`, `intelligence`, `audit`).
- **Authentication & Authorization**: JWT token validation paired with `TenantGuard` and `RolesGuard`. Context is bound to incoming request scope.
- **Validation**: Global `ValidationPipe` enforcing `class-validator` rules on incoming DTOs.
- **Health Probes**: Liveness (`/api/v1/health/liveness`) and Readiness (`/api/v1/health/readiness`), with readiness dynamically testing database and Redis connection boundaries.

---

### 3. Persistence & Tenant Isolation (`packages/database`)

- **ORM**: Prisma ORM with PostgreSQL backend schema (`schema.prisma`).
- **Tenant Isolation Pattern**: Domain repositories extend `TenantScopedRepository`. Every query parameter automatically includes `tenantId` extracted from request context:
  ```typescript
  // Example pattern from tenant-scoped.repository.ts
  async findFirst(args: Prisma.Args<T, 'findFirst'>) {
    return this.model.findFirst({
      ...args,
      where: { ...args.where, tenantId: this.tenantId }
    });
  }
  ```
- **Indexes**: Compound indices configured over `(tenantId, timestamp)`, `(tenantId, status)`, and `(tenantId, hash)` for sub-millisecond query execution.

---

### 4. Asynchronous Pipeline & Redis Boundary (`apps/api/src/queues`)

- **Queue Engine**: BullMQ on Redis.
- **Ingestion Decoupling**: REST API validates events synchronously (< 50ms response) and pushes structured jobs into the `security-events` BullMQ queue.
- **Worker Hardening**: `QueueWorker` processes events asynchronously with exponential backoff retries, dead-letter queue routing on repeated failures, and deterministic job ID deduplication.
- **Production Guard**: Strict environment validation forces real Redis connections in production (`NODE_ENV=production`), refusing fallback to mock drivers.

---

### 5. Detection & Correlation Engines

- **Detection**: `DetectionService` matches normalized event attributes against explicit rules (e.g. LSASS access, brute-force attempts). Matched rules generate structured Alert entities.
- **Correlation**: `CorrelationService` aggregates active alerts into unified Incident objects based on shared asset IDs, user identity accounts, IP/MAC network indicators, IOC hash matches, and a 1-hour temporal window.

---

### 6. Audit & State Transitions (`apps/api/src/audit`)

- **State Transitions**: Incident status changes follow backend-authoritative state transitions (`OPEN` → `IN_PROGRESS` → `RESOLVED` / `CLOSED`).
- **Audit Logging**: `AuditService` records all state transitions and investigation operations in an append-only database table, storing actor, action, timestamp, entity ID, and state diff metadata.
