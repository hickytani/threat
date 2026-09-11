# API Contracts — ThreatSync OS

This document is the authoritative inventory of the application API contracts currently implemented in the repository. It is intended to keep the backend and frontend aligned on real request and response shapes, auth behavior, tenant scoping, pagination, filtering, and error structures.

## Authentication

### POST /auth/register
- Auth required: No
- Permissions: None
- Request body:
  ```json
  {
    "fullName": "Jane Analyst",
    "email": "jane@company.com",
    "password": "StrongPass123!",
    "organizationName": "Acme SOC"
  }
  ```
- Success response:
  ```json
  {
    "user": {
      "id": "user_123",
      "email": "jane@company.com",
      "fullName": "Jane Analyst"
    },
    "organization": {
      "id": "org_123",
      "name": "Acme SOC"
    }
  }
  ```
- Errors:
  - `409 CONFLICT` if email already exists
  - `400 BAD_REQUEST` if password is invalid

### POST /auth/login
- Auth required: No
- Permissions: None
- Request body:
  ```json
  {
    "email": "analyst@threatsync.local",
    "password": "ThreatSyncSecured2026!"
  }
  ```
- Success response:
  ```json
  {
    "user": {
      "id": "user_123",
      "email": "analyst@threatsync.local",
      "fullName": "Analyst"
    },
    "memberships": [
      {
        "id": "member_123",
        "organizationId": "org_123",
        "organizationName": "ThreatSync Demo Org",
        "role": "SECURITY_ANALYST"
      }
    ]
  }
  ```
- Side effects:
  - Sets `access_token` and `refresh_token` HttpOnly cookies
  - Creates a persisted session record linked to the user
  - Binds the session to the first organization membership as active tenant context when available
- Errors:
  - `401 UNAUTHORIZED` for invalid credentials

### POST /auth/refresh
- Auth required: Refresh token from cookie
- Permissions: None
- Success response: same shape as login
- Side effects:
  - Rotates refresh token and session
- Errors:
  - `401 UNAUTHORIZED` if token missing or invalid

### POST /auth/logout
- Auth required: Session token from cookie
- Permissions: None
- Success response:
  ```json
  { "success": true }
  ```
- Side effects:
  - Deletes refresh/session token from database
  - Clears cookies

### GET /auth/session
- Auth required: Yes (`JwtAuthGuard`)
- Permissions: Any authenticated user
- Success response:
  ```json
  {
    "user": {
      "id": "user_123",
      "email": "analyst@threatsync.local",
      "fullName": "Analyst"
    },
    "memberships": [
      {
        "id": "member_123",
        "organizationId": "org_123",
        "organizationName": "ThreatSync Demo Org",
        "role": "SECURITY_ANALYST"
      }
    ]
  }
  ```

## Tenant / organization context
- Tenant context is resolved on the backend from the authenticated session and active organization membership via `JwtAuthGuard`.
- `TenantGuard` enforces that a route has a resolved `request.member.organizationId`.
- The frontend must not invent or override organizationId on the client; it should use the session membership returned by the backend.

## Organizations

### GET /organizations/current
- Auth required: Yes
- Permissions: Any authenticated member with tenant context
- Success response: current organization record

### PATCH /organizations/current
- Auth required: Yes
- Permissions: Any authenticated member with tenant context
- Request body:
  ```json
  {
    "name": "Updated Org Name",
    "size": "50-100",
    "industry": "Technology",
    "country": "US",
    "timeZone": "UTC"
  }
  ```
- Success response: updated organization

### GET /organizations/current/members
- Auth required: Yes
- Permissions: Any authenticated member with tenant context
- Success response: organization member list

### POST /organizations/current/seed-demo
- Auth required: Yes
- Permissions: Any authenticated member with tenant context
- Success response: seeder result payload

## Assets

### GET /assets
- Auth required: Yes
- Tenant scope: Yes
- Query params:
  - `search?: string`
  - `type?: AssetType`
- Success response: array of asset objects
- Example:
  ```json
  [
    {
      "id": "asset_123",
      "organizationId": "org_123",
      "hostname": "web-gateway-01",
      "displayName": "Corporate Public Reverse Proxy",
      "type": "API",
      "operatingSystem": null,
      "ipAddress": "203.0.113.15",
      "businessCriticality": "HIGH",
      "environment": "PROD",
      "isInternetFacing": true,
      "monitoringStatus": "ACTIVE",
      "riskScore": 64,
      "tags": ["Seeded", "PROD", "API"],
      "vulnerabilityCount": 1,
      "activeAlertCount": 0,
      "lastObserved": "2026-09-10T00:00:00.000Z",
      "createdAt": "2026-09-10T00:00:00.000Z",
      "updatedAt": "2026-09-10T00:00:00.000Z"
    }
  ]
  ```

### GET /assets/:assetId
- Auth required: Yes
- Tenant scope: Yes
- Success response: single asset

### POST /assets
- Auth required: Yes
- Tenant scope: Yes
- Request body: asset create payload
- Success response: created asset

### PATCH /assets/:assetId
- Auth required: Yes
- Tenant scope: Yes
- Request body: partial asset update

### DELETE /assets/:assetId
- Auth required: Yes
- Tenant scope: Yes

## Alerts

### GET /alerts
- Auth required: Yes
- Tenant scope: Yes
- Query params:
  - `status?: AlertStatus`
  - `severity?: AlertSeverity`
  - `category?: string`
  - `assetId?: string`
  - `search?: string`
- Success response: array of alerts with asset summary
- Example:
  ```json
  [
    {
      "id": "alert_123",
      "organizationId": "org_123",
      "title": "Authentication anomaly detected",
      "description": "Failed login password challenge for administrator",
      "severity": "MEDIUM",
      "status": "NEW",
      "category": "AUTHENTICATION_ANOMALY",
      "source": "OktaIDP",
      "assetId": "asset_123",
      "ipAddress": null,
      "confidenceScore": 85,
      "rawEvent": {},
      "incidentId": null,
      "tags": ["DetectionEngine", "AUTHENTICATION_ANOMALY"],
      "mitreTechniques": [],
      "timestamp": "2026-09-10T00:00:00.000Z",
      "createdAt": "2026-09-10T00:00:00.000Z",
      "updatedAt": "2026-09-10T00:00:00.000Z"
    }
  ]
  ```

### GET /alerts/:alertId
- Auth required: Yes
- Tenant scope: Yes
- Success response: alert investigation detail with detectionRule, detectionReason, matchedConditions, contributingEvents, ioc, asset, and incident.

### PATCH /alerts/:alertId
- Auth required: Yes
- Tenant scope: Yes
- Request body:
  ```json
  {
    "status": "INVESTIGATING",
    "assignedAnalystId": "user_456"
  }
  ```
- Success response: updated alert

### POST /alerts/:alertId/create-incident
- Auth required: Yes
- Tenant scope: Yes
- Success response: created incident object
- Side effects:
  - creates incident
  - links incidentId to alert
  - sets alert status to `ESCALATED`
  - writes audit log

## Incidents

### GET /incidents
- Auth required: Yes
- Tenant scope: Yes
- Query params:
  - `status?: IncidentStatus`
  - `severity?: AlertSeverity`
  - `priority?: AlertSeverity`
  - `assigneeId?: string`
- Success response: array of incidents

### GET /incidents/:incidentId
- Auth required: Yes
- Tenant scope: Yes
- Success response: full incident investigation detail with `alerts`, `tasks`, `comments`, `evidence`, `triggeringEvents`, `affectedAssets`, `users`, `iocs`, `vulnerabilities`, `auditHistory`, and `timeline`.

### GET /incidents/:incidentId/timeline
- Auth required: Yes
- Tenant scope: Yes
- Success response: array of deterministic `TimelineItem` objects ordered chronologically.

### POST /incidents
- Auth required: Yes
- Tenant scope: Yes
- Request body:
  ```json
  {
    "title": "Suspicious authentication campaign",
    "summary": "Investigate failed login pattern",
    "severity": "HIGH",
    "priority": "HIGH",
    "incidentType": "POLICY_VIOLATION",
    "assignedAnalystId": "user_456",
    "tags": ["identity"]
  }
  ```
- Success response: created incident

### PATCH /incidents/:incidentId
- Auth required: Yes
- Tenant scope: Yes
- Lifecycle validation:
  - Enforces allowed status transitions (`OPEN` -> `TRIAGED`/`INVESTIGATING`/`CLOSED`; `TRIAGED` -> `INVESTIGATING`/`CONTAINMENT_IN_PROGRESS`/`CLOSED`; `INVESTIGATING` -> `CONTAINMENT_IN_PROGRESS`/`CONTAINED`/`REMEDIATION_IN_PROGRESS`/`RESOLVED`/`CLOSED`, etc.).
  - Returns `400 BAD_REQUEST` for invalid state transitions.
  - Idempotent: when `status` is unchanged, returns current incident without generating duplicate transition audit records.
  - Generates audit log for valid state changes (`INCIDENT_STATUS_TRANSITION`).

## Events

### GET /events
- Auth required: Yes
- Tenant scope: Yes
- Query params:
  - `startTime?: string`
  - `endTime?: string`
  - `eventType?: string`
  - `severity?: AlertSeverity`
  - `source?: string`
  - `assetId?: string`
  - `userIdentity?: string`
  - `ipAddress?: string`
  - `domain?: string`
  - `ioc?: string`
  - `page?: number` (default 1)
  - `pageSize?: number` (default 20, max 100)
- Success response:
  ```json
  {
    "data": [ ... ],
    "meta": {
      "page": 1,
      "pageSize": 20,
      "total": 120,
      "totalPages": 6
    }
  }
  ```

### GET /events/:id
- Auth required: Yes
- Tenant scope: Yes
- Success response: single security event record

### POST /events/ingest
- Auth required: Yes
- Tenant scope: Yes
- Request body: ingestion payload
- Success response: `{ normalizedEvent, storedEvent, alertsCreated, deduplicated }`

## Intelligence

### GET /intelligence/iocs
- Auth required: Yes
- Tenant scope: Yes
- Success response: array of persisted IOC records

### GET /intelligence/iocs/:id
- Auth required: Yes
- Tenant scope: Yes
- Success response: IOC investigation footprint including `observations`, `alerts`, `incidents`, `affectedAssets`, `enrichments`, `intelligenceResult`, and `timeline`.

### POST /intelligence/investigate
- Auth required: Yes
- Tenant scope: Yes
- Request body: `{ "value": "8.8.8.8", "type": "IPV4" }`
- Success response: local & external threat intelligence findings

## Audit

### GET /audit-logs
- Auth required: Yes
- Tenant scope: Yes
- Success response: array of audit log rows

## Health

### GET /health/live
- Auth required: No
- Success response:
  ```json
  { "status": "healthy", "timestamp": "2026-09-10T00:00:00.000Z" }
  ```

### GET /health/ready
- Auth required: No
- Success response:
  ```json
  { "status": "ready", "timestamp": "2026-09-10T00:00:00.000Z" }
  ```

### GET /health/dependencies
- Auth required: No
- Success response:
  ```json
  {
    "status": "healthy",
    "dependencies": {
      "database": "UP",
      "redis": "DOWN (In-memory Fallback)",
      "ai": "mock"
    },
    "timestamp": "2026-09-10T00:00:00.000Z"
  }
  ```

## Error contract
- The current backend is inconsistent in its error payloads; the preferred standardized error shape is:
  ```json
  {
    "code": "NOT_FOUND",
    "message": "Alert not found",
    "requestId": "req_abc123"
  }
  ```
- The frontend should treat unexpected responses defensively and map them to UI states such as loading, empty, error, unauthorized, provider unavailable, and tenant access denied.

## Pagination and filtering
- Collection endpoints currently return arrays rather than a pagination envelope.
- Query filters are implemented on a best-effort basis for alerts, incidents, assets, and vulnerabilities.
- Current convention is query param filtering rather than a unified page/cursor envelope.
- The frontend should not manufacture pagination metadata that the backend does not return.

## Enums and canonical values
- Shared types in `packages/shared-types/src/index.ts` are the authoritative definitions for these enums and payload interfaces.
- Frontend should consume these shared types rather than re-declaring duplicate states.

## Implementation status
- Real and verified: auth, organizations, assets, alerts, incidents, events, intelligence, audit, vulnerabilities, health
- Development-only: queue fallback, demo seed data, AI mock provider, in-memory Redis fallback
- External providers: not yet genuinely integrated beyond explicit provider abstraction
