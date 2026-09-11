# ThreatSync OS — System Architecture Specification

ThreatSync OS is an enterprise Security Operations Center (SOC) investigation platform and telemetry processing engine built with a multi-tenant monorepo architecture.

## Monorepo Layout

```text
threatsync-os/
├── apps/
│   ├── api/          # NestJS 10 REST API, Auth, Queues & Domain Services
│   └── web/          # Next.js 14 App Router SOC Analyst Console
├── packages/
│   ├── database/     # Prisma ORM Schema & Migration Engine (PostgreSQL)
│   └── shared-types/ # Shared TypeScript Contracts, Enums & DTO Interfaces
└── docs/             # Technical Specifications & Operational Runbooks
```

## System Layers

### 1. Database & Persistence Layer (`packages/database`)
- **PostgreSQL**: Relational database storing Tenant Organizations, Assets, Security Events, Detection Rules, Alerts, Incidents, IOCs, Asset Vulnerabilities, and Audit Logs.
- **Compound Indexes**: Optimized B-tree indexes for organization-scoped investigation queries:
  - `SecurityEvent`: `[organizationId, timestamp]`, `[organizationId, assetId]`, `[organizationId, eventType]`, `[organizationId, sourceIp]`
  - `Alert`: `[organizationId, timestamp]`
  - `AuditLog`: `[organizationId, resourceType, resourceId]`

### 2. Backend Domain Services (`apps/api`)
- **NestJS Architecture**: Modular controllers, services, guards, and middleware.
- **Tenant Isolation**: `TenantGuard` and `TenantScopedRepository` bind every database query to `request.user.organizationId` derived from the session JWT token. Arbitrary client overrides are rejected.
- **Asynchronous Queue Engine**: BullMQ with Redis backing (`telemetry-ingestion` and `alert-escalation` queues) for decoupled event processing, retries (exponential backoff), idempotency deduplication, and dead-letter queueing (`removeOnFail`).
- **Correlation & Risk Engines**: `CorrelationService` evaluates incoming alerts against multi-asset lateral movement and threat indicator rules to correlate alerts into unified `Incident` tickets and update dynamic `Asset` risk scores (0–100%).

### 3. API Contract & Shared Types Layer (`packages/shared-types`)
- Shared TypeScript interfaces (`IncidentInvestigationDetail`, `AlertInvestigationDetail`, `IocInvestigationDetail`, `AssetInvestigationDetail`, `PaginatedResponse<T>`, `TimelineItem`, `EventSearchQuery`).
- Enums for `AlertSeverity`, `AlertStatus`, `IncidentStatus`, `AssetType`, `IocType`, `UserRole`.

### 4. Analyst Console Interface (`apps/web`)
- **Next.js 14 App Router**: React 18, TailwindCSS, Lucide Icons, and ReactFlow.
- **Centralized API Client**: `apps/web/lib/api-client.ts` centralizes all HTTP calls (`apiRequest<T>`), passing session cookies and handling error status contracts (401, 403, 404, 500).
- **Investigation Consoles**: Deep entity investigation pages with deterministic timelines, detection evidence, explainable risk contributors, and lifecycle state transition controls.
