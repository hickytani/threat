# ThreatSync OS — Engineering Interview Technical Cheat Sheet

This document contains concise, technically grounded answers for 18 core architecture and security questions based strictly on the ThreatSync OS implementation.

---

### 1. Explain ThreatSync OS in 30 seconds.
**Answer**: ThreatSync OS is a multi-tenant security operations and investigation platform built with Next.js, NestJS, Prisma, and Redis/BullMQ. It ingests and normalizes security telemetry, runs deterministic detection rules, correlates related alerts into unified incidents, calculates explainable asset risk scores, and maintains complete tenant-scoped authorization and audit trails.

### 2. Explain the event ingestion pipeline.
**Answer**: Events enter via NestJS REST endpoints (`/api/v1/events/ingest`), where payloads are validated using NestJS `ValidationPipe` (class-validator). Events undergo normalization into a canonical schema (source, action, target, actor, timestamp), deterministic SHA-256 fingerprinting for deduplication, and are dispatched to the background BullMQ queue for async worker processing.

### 3. How does multi-tenant isolation work?
**Answer**: Authorization operates through a two-tier mechanism: NestJS `TenantGuard` extracts tenant context from verified JWT claims or organization headers, setting request-scoped metadata. At the persistence layer, all data access calls use `TenantScopedRepository`, which automatically injects `tenantId` into every Prisma query condition (`where: { tenantId }`), preventing cross-tenant data leakage.

### 4. How do you prevent Insecure Direct Object References (IDOR)?
**Answer**: IDOR is prevented at the repository layer. Direct primary key lookups (e.g. `findOne(id)`) do not execute unconstrained `findById` queries; they evaluate `findFirst({ where: { id, tenantId } })`. If a user attempts to access an ID belonging to another organization, the query returns `null`/404 or throws a 403 Forbidden exception before any payload is returned.

### 5. How does event deduplication work?
**Answer**: Deduplication uses a SHA-256 hash computed over `tenantId`, `source`, `eventAction`, `actorId`, `targetId`, and a rounded 60-second timestamp window. If an event with an identical hash is received within the deduplication window, the system increments the existing record's repeat counter rather than creating duplicate database entries.

### 6. How does deterministic detection work?
**Answer**: The `DetectionService` evaluates incoming normalized events against explicit rule definitions (e.g. LSASS access, brute force attempts, unauthorized privilege escalation). Rules specify exact conditions over event attributes. When matched, an alert record is created with an explicit severity rating, confidence score, and references to the raw triggering events.

### 7. How does alert correlation work?
**Answer**: `CorrelationService` groups active alerts into unified Incidents by evaluating concrete relationships: shared asset IDs, user identity accounts, IP/MAC network indicators, IOC hash matches, and a 1-hour temporal proximity window. This replaces probabilistic heuristics with deterministic evidence graphs.

### 8. How is asset risk calculated and explained?
**Answer**: Asset risk scores (0–100 scale) are computed additively in `AssetsService`. The base score is determined by business criticality (Low: 5, Med: 12, High: 22, Critical: 30), plus cumulative alert severity weights, plus CVSS vulnerability ratings (`CVSS * 1.6`). The API exposes an explicit `contributors` array breaking down the exact point contributions for full UI transparency.

### 9. Why use BullMQ and Redis for async queue processing?
**Answer**: Decoupling ingestion from detection/correlation ensures API endpoint latency remains low (sub-50ms) even during event spikes. BullMQ backed by Redis provides durable job persistence, automatic retries with exponential backoff, dead-letter queue isolation, and concurrent worker scaling without blocking the primary web application.

### 10. How is queue processing idempotent?
**Answer**: Queue jobs carry a deterministic `jobId` derived from the event deduplication hash and tenant context. BullMQ suppresses duplicate job submissions with identical IDs. Furthermore, the queue worker re-verifies tenant context and event state before execution, ensuring re-driven or retried jobs produce idempotent side effects.

### 11. What happens when Redis is unavailable?
**Answer**: In production (`NODE_ENV=production`), `QueueService` enforces strict Redis boundary checks; missing Redis connections cause health check readiness probes to fail (`/api/v1/health` returns 503), preventing silent processing drops. In development mode (`NODE_ENV=development`), the service safely falls back to a synchronous local dispatcher.

### 12. Why use a threat-intelligence provider abstraction?
**Answer**: `IntelligenceService` implements a clean `ThreatIntelProvider` interface. This decouples local offline indicators (deterministic DB tables) from third-party REST services (VirusTotal, AbuseIPDB). The domain logic queries the provider interface, allowing seamless addition of external providers or rate-limit handling without refactoring correlation logic.

### 13. Why is local threat intelligence deterministic?
**Answer**: Local intelligence guarantees zero external API dependencies, zero network latency, and deterministic evaluation during offline development, testing, and continuous integration pipelines. It returns structured reputation scores and indicator categories matching the external provider schema.

### 14. How does incident state management work?
**Answer**: Incident lifecycle state transitions (`OPEN` → `IN_PROGRESS` → `RESOLVED` / `CLOSED`) are enforced backend-authoritatively. State mutations validate analyst authorization, require mandatory analyst commentary for resolution, and generate immutable audit log entries.

### 15. How is the audit trail generated?
**Answer**: Audit log records are produced via `AuditService` during key state mutations (incident transitions, rule updates, user role changes, investigation exports). Records store `tenantId`, `actorId`, `action`, `entityType`, `entityId`, `ipAddress`, `timestamp`, and state diff metadata.

### 16. How would you scale event ingestion to 100k events/sec?
**Answer**: I would place a distributed streaming buffer (Apache Kafka or AWS Kinesis) in front of the NestJS ingestion service, scale stateless NestJS ingestion pods horizontally behind an L7 load balancer, utilize Redis cluster mode for BullMQ worker queues, and partition database writes across time-series event stores (e.g. PostgreSQL hypertables or ClickHouse) while maintaining relational database stores for stateful Incidents/Assets.

### 17. What would you change before deploying to production?
**Answer**: I would implement production Kafka streaming for events, introduce Vault/KMS secrets management, configure TLS mutual authentication for worker-Redis transport, add OpenTelemetry tracing spans across API and workers, implement database query caching via Redis, and set up automated data retention policies.

### 18. What are the system's biggest current limitations?
**Answer**: ThreatSync OS currently relies on HTTP REST event ingestion rather than agent-based eBPF/Syslog connectors, relies on local deterministic intelligence unless API keys are supplied for external providers, and does not perform autonomous active response actions (e.g., automated firewall IP blocking).
