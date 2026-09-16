# Telemetry Ingestion

## Machine Credential Lifecycle

Organization admins and SOC managers create credentials from the dashboard at **Telemetry Ingestion** or through the API:

```http
POST /api/v1/organizations/current/ingestion-credentials
Cookie: access_token=<browser session>
Content-Type: application/json

{"name":"production collector","expiresAt":"2027-01-01T00:00:00.000Z"}
```

The response contains the full token once. ThreatSync stores only a SHA-256 hash and a short display prefix. The full token cannot be recovered later.

Credentials can be listed without secrets:

```http
GET /api/v1/organizations/current/ingestion-credentials
```

Revoke a credential:

```http
DELETE /api/v1/organizations/current/ingestion-credentials/:id
```

## Sending an Event

Use the machine credential, not an analyst JWT or refresh cookie:

```http
POST /api/v1/events/ingest
Authorization: Bearer ts_ing_<credential>
Content-Type: application/json

{
  "eventType": "AUTHENTICATION_ANOMALY",
  "source": "your-agent",
  "action": "login",
  "outcome": "FAILURE",
  "severity": "HIGH",
  "message": "Failed login challenge",
  "hostname": "workstation-01",
  "metadata": {
    "eventId": "evt-123",
    "sourceIp": "203.0.113.10"
  },
  "rawEvent": {
    "providerEventId": "provider-123"
  }
}
```

Use `?async=true` to enqueue the event through BullMQ:

```http
POST /api/v1/events/ingest?async=true
```

The asynchronous response contains an accepted status and queue job ID. In production, Redis must be configured and the in-memory fallback is rejected.

## Processing Contract

```text
ingestion credential
  -> tenant resolution
  -> validation and normalization
  -> recent duplicate detection
  -> SecurityEvent persistence
  -> deterministic alert rules
  -> asset risk update
  -> correlation and incident workflow
  -> audit record
```

The source credential scopes the event to its organization. The client cannot choose another organization by including an organization ID in the payload.

## Operational Notes

- Credentials are revocable and optionally expiring.
- The dashboard reports event count and latest event time for the active organization.
- Payload size, provider-specific schemas, and connector retry policies should be enforced at the edge or collector layer before high-volume production rollout.
- No commercial SIEM or EDR connector is claimed by this repository.
