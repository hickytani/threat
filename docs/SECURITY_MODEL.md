# ThreatSync OS — Security & Isolation Model

ThreatSync OS is designed around strict tenant isolation, immutable session authentication, role-based access control (RBAC), and deterministic audit trail logging.

## Core Security Controls

### 1. Authentication & Session Management
- **JWT Authentication**: User sessions are authenticated via JWT tokens passed via HttpOnly cookies (`JwtAuthGuard`).
- **Session Resolution**: Session context contains `userId`, `email`, and active `organizationId`. Client-supplied request body `organizationId` overrides are strictly ignored.

### 2. Multi-Tenant Isolation (Anti-IDOR)
- **Tenant Scope Enforcement**: `TenantGuard` validates that the requesting user is an active member of the target organization.
- **Repository-Level Isolation**: `TenantScopedRepository` injects `where: { organizationId: this.organizationId }` into all database queries.
- **Cross-Tenant IDOR Protection**: Direct resource ID substitution attempts (e.g. attempting to fetch an incident or asset belonging to Org B using an Org A token) return `404 Not Found` or `403 Forbidden`.

### 3. Role-Based Access Control (RBAC)
- **Role Hierarchy**: `SUPER_ADMIN` > `ORG_ADMIN` > `SOC_MANAGER` > `SECURITY_ANALYST` > `COMPLIANCE_VIEWER` / `EXECUTIVE_VIEWER`.
- **Analyst & Owner Scope**: Assignees and task owners must belong to the active organization (`prisma.organizationMember`). Out-of-org analyst IDs are rejected with `400 Bad Request`.

### 4. Incident Lifecycle State Graph
Incident status transitions follow a strict graph:

```text
OPEN ──> TRIAGED ──> INVESTIGATING ──> CONTAINMENT_IN_PROGRESS ──> CONTAINED ──> REMEDIATION_IN_PROGRESS ──> MONITORING ──> RESOLVED ──> CLOSED
  │         │               │                      │                   │                   │                    │            │
  └─────────┴───────────────┴──────────────────────┴───────────────────┴───────────────────┴────────────────────┴────────────┘
                                                     │
                                             (Can jump to CLOSED at any stage)
```

- Invalid state jumps return `400 Bad Request`.
- Repeated status updates with unchanged values return early without creating duplicate audit logs (idempotency).

### 5. Audit Logging Integrity
- All state changes, escalations, event ingestions, and triage actions create `AuditLog` records storing `organizationId`, `actorId`, `actorEmail`, `action`, `resourceType`, `resourceId`, `requestId`, `outcome`, `previousValues`, and `newValues`.
