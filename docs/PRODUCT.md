# ThreatSync OS Product Contract

## What It Is

ThreatSync OS is a tenant-aware security operations workspace. A customer creates an organization, onboards assets, configures a machine ingestion credential, sends normalized security events, and investigates the resulting alerts, incidents, risk changes, and audit records.

The current product is an operational alpha: the core domain workflow is real and database-backed, but enterprise integrations and production operations still require deployment-specific work.

## Implemented

- User registration creates a new organization and assigns the creator `ORG_ADMIN`.
- Passwords are hashed with bcrypt and sessions use HTTP-only cookies with database-backed session records.
- Tenant context is derived from the verified session membership, never from a browser-supplied organization ID.
- Assets, alerts, incidents, events, intelligence, vulnerabilities, and audit records are organization-scoped.
- Organization admins and SOC managers can create and revoke ingestion credentials.
- `POST /api/v1/events/ingest` accepts a dedicated `ts_ing_` bearer credential.
- Event normalization, duplicate detection, deterministic rule evaluation, risk updates, correlation, incident transitions, and audit logging are implemented.
- Dashboard metrics query the current organization and refresh in the foreground every 30 seconds.
- Empty organizations remain empty and show an ingestion-oriented empty state.
- Production configuration rejects missing Redis and unsafe in-memory queue fallback.
- Demo seeding is disabled unless `ALLOW_DEMO_SEED=true` and never allowed in production.

## Explicitly Not Claimed

- No direct SIEM, EDR, syslog, Sentinel, Splunk, CrowdStrike, Defender, Okta, or CloudTrail connector is included.
- Polling is used for the dashboard; this is not WebSocket or SSE realtime.
- External VirusTotal and AbuseIPDB responses are not fabricated when providers are unavailable.
- Billing, SSO/SAML, MFA, email verification, and managed-cloud provisioning are not complete.
- The worker is currently started with the API process through the existing queue module; split deployment needs an explicit worker entrypoint.

## Customer Success Path

1. Register and create an organization.
2. Sign in and open **Telemetry Ingestion**.
3. Create an ingestion credential and copy it once.
4. Send an event to `/api/v1/events/ingest`.
5. View event, alert, asset, risk, incident, and audit outcomes in the workspace.
6. Revoke the credential when the source is retired.

## Readiness

Current classification: **deployable technical alpha / controlled pilot**, not a finished enterprise SaaS product. A public launch still requires production infrastructure, distributed rate limiting, connector operations, stronger identity features, deployment automation, and a security review against the actual hosting topology.
