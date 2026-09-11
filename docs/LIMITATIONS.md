# ThreatSync OS — Honest Technical Limitations & Scope Boundaries

This document provides a transparent specification of current implementation boundaries, infrastructure requirements, and scope limits.

## Infrastructure & Environment Boundaries

### 1. Redis Queue Requirement
- **Production Mode (`NODE_ENV=production`)**: Real Redis instance via `REDIS_URL` is mandatory. In-memory queue fallback (`ioredis-mock`) is strictly disabled unless `ENABLE_IN_MEMORY_QUEUE_FALLBACK=true` is set.
- **Local Development**: In-memory mock Redis client (`ioredis-mock`) is enabled by default to allow offline development without running a local Redis daemon.

### 2. External Threat Intelligence Feeds
- **Provider API Keys**: Integration with VirusTotal or AbuseIPDB requires environment variables `VIRUSTOTAL_API_KEY` and `ABUSEIPDB_API_KEY`.
- **Fallback Behavior**: When external API keys are missing or provider endpoints are rate-limited/unreachable, external intelligence status cleanly reports `UNAVAILABLE` while local threat intelligence cache remains operational. Unavailable external providers are never disguised as successful enrichments.

### 3. Live Agent Sensors
- **SIEM/EDR Ingestion**: Telemetry ingestion accepts JSON event payloads via `POST /events/ingest` and `/events/ingest?async=true`. ThreatSync OS does not include proprietary kernel-level EDR agent drivers or direct network tap hardware.

### 4. Real-Time Telemetry & WebSockets
- **HTTP Query Model**: Frontend components poll backend APIs on demand or during user interactions. WebSocket real-time pushes are not active for every data feed.

### 5. Seed Data Semantics
- **Development Data**: Database seed scripts populate deterministic security scenarios (malicious IP connections, brute force attempts, lateral movement chains) for demonstration and testing purposes. Seed data is strictly restricted to development environments and is never hardcoded into domain logic.
