# ThreatSync OS — Public Telemetry Ingestion API Specification

ThreatSync OS provides a real-time telemetry ingestion pipeline backed by PostgreSQL, BullMQ, and Redis. All fields in this document are derived from the actual `IngestEventDto` and `EventPipelineService` implementation.

---

## Authentication

Two mechanisms are supported for all ingestion endpoints:

| Method | How |
| :--- | :--- |
| `Authorization: Bearer <token>` | Recommended. Standard Bearer token format. |
| `X-Ingestion-Token: <token>` | Alternative header (useful for webhooks/agents). |
| `X-Ingestion-Key: <token>` | Alias for `X-Ingestion-Token`. |
| `X-API-Key: <token>` | Alias for `X-Ingestion-Token`. |

**Tokens** are created from the ThreatSync OS web UI (Settings → Ingestion Credentials) or via API. They take the format `ts_ing_<base64url-randomness>`. Only the SHA-256 hash is stored server-side. **The raw token is displayed only once.**

---

## Ingestion Endpoints

### 1. Synchronous Ingestion (Recommended for low-latency agents)

```
POST /api/v1/events/ingest
Content-Type: application/json
Authorization: Bearer ts_ing_<your_token>
```

**Behavior**: Processes the event immediately through the canonical `EventPipelineService`, then returns the processing result. Suitable for low-volume senders that need confirmation of detection and alert creation before proceeding.

**Rate limit**: 300 requests/minute per credential IP.

---

### 2. Asynchronous Ingestion (Recommended for high-throughput agents)

```
POST /api/v1/events/ingest?async=true
Content-Type: application/json
Authorization: Bearer ts_ing_<your_token>
```

**Behavior**: Validates the schema, enqueues the payload to the BullMQ `telemetry-ingestion` queue via Redis, and returns `200 Accepted` immediately. The BullMQ worker executes `EventPipelineService.processEvent()` asynchronously. Up to 3 retry attempts with exponential backoff on failure.

---

## Request Payload

All fields are optional except where noted by your detection rules.

```json
{
  "eventType": "EDR_PROCESS_SPAWN",
  "source": "CrowdStrike_Falcon",
  "action": "PROCESS_EXECUTION",
  "outcome": "SUCCESS",
  "severity": "HIGH",
  "message": "Suspicious process cmd.exe spawned by powershell.exe",
  "hostname": "workstation-01.internal",
  "ipAddress": "10.0.1.105",
  "userIdentity": "CORP\\jsmith",
  "idempotencyKey": "evt_unique_hash_98231",
  "rawJson": "{\"process_id\": 4012, \"command_line\": \"powershell -enc ...\"}",
  "metadata": {
    "destinationIp": "203.0.113.42",
    "pid": 4012,
    "parentProcessName": "powershell.exe"
  }
}
```

### Field Reference

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `eventType` | String | Recommended | Event classifier. Examples: `EDR_PROCESS_SPAWN`, `AWS_CLOUDTRAIL_EVENT`, `FIREWALL_LOG`, `OKTA_AUTH_AUDIT`, `ENDPOINT_ANOMALY`. Used in detection rule matching. |
| `source` | String | Recommended | Originating system name, e.g. `CrowdStrike_Falcon`, `Sysmon`, `Palo Alto`. |
| `action` | String | No | Observed action, e.g. `PROCESS_EXECUTION`, `NETWORK_CONNECT`, `FILE_CREATE`. Defaults to `PROCESS_AUDIT`. |
| `outcome` | String | No | Result of the action: `SUCCESS`, `FAILURE`, `BLOCKED`, `UNKNOWN`. Defaults to `UNKNOWN`. |
| `severity` | String | No | Sender-reported severity: `INFORMATIONAL`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Defaults to `LOW`. |
| `message` | String | No | Human-readable log summary. |
| `hostname` | String | No | Hostname of the originating asset. Used for automatic asset resolution and registration. |
| `ipAddress` | String | No | Source IP address of the originating host. |
| `userIdentity` | String | No | User account involved in the event. |
| `idempotencyKey` | String | No | Unique deduplication key. If submitted within 5 minutes of an identical key, the event is marked duplicate and no new alert is generated. |
| `rawJson` | String | No | Full raw log line or serialized JSON telemetry payload. |
| `metadata` | Object | No | Arbitrary additional fields (destination IP, process ID, file hashes, etc.). Stored as JSONB. |
| `rawEvent` | Object | No | Alternative to `rawJson` for pre-parsed structured event objects. |

---

## Duplicate Handling

- A sliding-window deduplication check runs on `idempotencyKey` (exact match) and on `(eventType, source, hostname)` within a 5-minute window.
- Duplicate events are stored in the audit log but **do not** generate new alerts.
- The sync ingestion response indicates `"deduplicated": true` when a duplicate is detected.

---

## Example: Minimal Telemetry Event

```bash
curl -X POST https://api.threatsync.io/api/v1/events/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ts_ing_<YOUR_TOKEN>" \
  -d '{
    "eventType": "ENDPOINT_ANOMALY",
    "source": "AgentIngest",
    "message": "Unauthorized privilege escalation detected",
    "hostname": "workstation-01",
    "severity": "HIGH"
  }'
```

**Expected Response**:
```json
{
  "normalizedEvent": { "eventId": "evt_l3p9x...", "eventType": "ENDPOINT_ANOMALY", "severity": "HIGH" },
  "storedEvent": { "id": "clx10293...", "organizationId": "org_..." },
  "alertsCreated": [],
  "incidentsCreated": [],
  "deduplicated": false
}
```

---

## Example: Full Detection-Triggering Event

```bash
curl -X POST https://api.threatsync.io/api/v1/events/ingest \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ts_ing_<YOUR_TOKEN>" \
  -d '{
    "eventType": "EDR_PROCESS_SPAWN",
    "source": "Sysmon",
    "action": "PROCESS_EXECUTION",
    "outcome": "SUCCESS",
    "severity": "HIGH",
    "message": "cmd.exe spawned by powershell.exe with encoded command",
    "hostname": "dc-01.prod.lan",
    "ipAddress": "10.0.1.10",
    "userIdentity": "CORP\\administrator",
    "idempotencyKey": "sysmon-evt-20260917-0049",
    "metadata": { "pid": 4012, "parentProcessName": "powershell.exe" }
  }'
```

---

## Example: Asynchronous Submission

```bash
curl -X POST https://api.threatsync.io/api/v1/events/ingest?async=true \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ts_ing_<YOUR_TOKEN>" \
  -d '{ "eventType": "FIREWALL_LOG", "source": "PaloAlto", "severity": "MEDIUM", "message": "Outbound connection to known bad IP" }'
```

**Expected Response** (`200 OK`):
```json
{ "queued": true, "jobId": "bullmq-job-1234", "status": "ACCEPTED" }
```

---

## CloudTrail Webhook Ingestion

ThreatSync OS includes built-in normalization for AWS CloudTrail push webhooks (e.g. delivered via SNS HTTP subscription).

- **Endpoint**: `POST /api/v1/events/webhook/<integration_id>`
- **Authentication**: Configured per integration via `x-webhook-secret` or `Authorization: Bearer` header.
- CloudTrail event envelopes are automatically unwrapped and normalized:
  - `eventName` → `action`
  - `eventSource` → `source`
  - `userIdentity.arn` → `userIdentity`
  - `sourceIPAddress` → `ipAddress`
- **ThreatSync OS does NOT directly poll AWS S3 buckets, CloudWatch Logs, or SQS queues.** It ingests CloudTrail payloads that are pushed to it via webhook.

---

## Error Responses

| HTTP Status | Code | Description |
| :--- | :--- | :--- |
| `401` | `UNAUTHORIZED` | Ingestion token missing, invalid, revoked, or expired. |
| `400` | `BAD_REQUEST` | Malformed JSON or non-whitelisted field present in request body. |
| `429` | `RATE_LIMITED` | Rate limit exceeded (300 req/min default per credential/IP). Retry after `Retry-After` seconds. |
| `503` | `SERVICE_UNAVAILABLE` | Redis unavailable (async path only). |

---

## Ingestion Credential Lifecycle

1. Created in **Settings → Ingestion Credentials** or via `POST /api/v1/organizations/current/ingestion-credentials`.
2. The raw token (`ts_ing_...`) is **displayed once**. It cannot be retrieved after leaving the reveal screen.
3. Only a SHA-256 hash of the token is stored in the database.
4. Credentials can be revoked at any time via `DELETE /api/v1/organizations/current/ingestion-credentials/:id`.
5. Optional expiry date can be set at creation time.
