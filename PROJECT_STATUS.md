# ThreatSync OS — Product Capability Matrix & Truth Status

This document provides a factual, verified breakdown of every capability in ThreatSync OS, classifying features into strict evidence-backed categories.

---

## Capability Matrix

| Capability | Backend API | Frontend Console | Database Persisted | Test Coverage | External Dependency | Classification |
|---|---|---|---|---|---|---|
| **Event Ingestion & Normalization** | `POST /api/v1/events/ingest` | `/dashboard/explorer` | PostgreSQL `SecurityEvent` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Event Deduplication** | 5-minute sliding window | `/dashboard/explorer` | PostgreSQL `SecurityEvent` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Detection Rule Engine** | `RulesService` (6 operators) | `/dashboard/rules` | PostgreSQL `DetectionRule` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Alert Generation** | `EventsService.runDetections` | `/dashboard/alerts` & `/[id]` | PostgreSQL `Alert` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Asset Risk Recalculation** | `AssetsService.recalculateRisk` | `/dashboard/assets` & `/[id]` | PostgreSQL `Asset` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Incident Correlation Engine** | `CorrelationService` | `/dashboard/incidents` & `/[id]` | PostgreSQL `Incident` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Incident State Machine** | `IncidentsService.updateStatus` | `/dashboard/incidents/[id]` | PostgreSQL `Incident` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Analyst Notes & Remediation Tasks** | `IncidentsService.addComment` | `/dashboard/incidents/[id]` | PostgreSQL `IncidentComment` / `IncidentTask` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **IOC Local Intelligence Cache** | `LocalThreatIntelProvider` | `/dashboard/investigate` & `/ioc` | PostgreSQL `IOC` & `IOCEnrichment` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Multi-Tenant Isolation** | Request-scoped repositories | All dashboard routes | PostgreSQL `organizationId` index | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Role-Based Access Control (RBAC)** | `TenantRbacGuard` | All dashboard routes | PostgreSQL `OrganizationMember` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **SSRF Destination Safeguards** | Private IP / Protocol regex | `/dashboard/notifications/policies` | DB Notification Policy | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Integration Secret Encryption** | AES-256-GCM encryption | `/dashboard/integrations` | PostgreSQL `Integration` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **Security Audit Logging** | `AuditService.logAction` | `/dashboard/audit` | PostgreSQL `AuditLog` | Jest + HTTP E2E | None | **VERIFIED LOCALLY** |
| **In-Memory Queue Fallback** | `QueueService` mock fallback | Header / Health controller | Memory array | Jest + HTTP E2E | None | **LOCAL DEVELOPMENT** |
| **VirusTotal v3 Connector** | `ExternalThreatIntelProvider` | `/dashboard/investigate` | External API / Local fallback | Jest unit tests | VirusTotal API Key | **OPTIONAL EXTERNAL** |
| **AbuseIPDB v2 Connector** | `ExternalThreatIntelProvider` | `/dashboard/investigate` | External API / Local fallback | Jest unit tests | AbuseIPDB API Key | **OPTIONAL EXTERNAL** |
| **Production Redis / BullMQ Daemon** | `QueueService` / `QueueWorker` | Health endpoint (`/health/ready`) | Redis instance | Boundary check unit test | Redis Server (Port 6379) | **NOT VERIFIED** |
| **Live External Webhook Delivery** | `NotificationsService` | `/dashboard/notifications` | HTTP POST target | SSRF unit test | External HTTP Receiver | **NOT VERIFIED** |
| **Autonomous AI Threat Remediation** | N/A | N/A | N/A | N/A | N/A | **NOT IMPLEMENTED** |

---

## Status Classifications

- **VERIFIED LOCALLY**: End-to-end verified with live local PostgreSQL 18, HTTP Supertest integration suite, NestJS controllers, and Next.js console pages.
- **LOCAL DEVELOPMENT**: Fallback behavior enabled in non-production environments to allow Redis-free local development (`ENABLE_IN_MEMORY_QUEUE_FALLBACK=true`).
- **OPTIONAL EXTERNAL**: Fully implemented provider abstraction that operates safely when external API credentials are provided and returns explicit `UNAVAILABLE` states when unconfigured.
- **NOT VERIFIED**: System code exists and passes unit boundary checks, but full live execution requires external infrastructure (e.g. Redis daemon process or live external webhooks) not present in local test environment.
- **NOT IMPLEMENTED**: Out-of-scope capabilities explicitly excluded from product claims.
