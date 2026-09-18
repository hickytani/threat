# ThreatSync OS — Telemetry Processing & Detection Pipeline

ThreatSync OS converts raw security events into explainable alerts, dynamic asset risk scores, and correlated security incidents via an asynchronous BullMQ queue pipeline.

## End-to-End Processing Workflow

```text
RAW TELEMETRY EVENT
      │
      ▼
INGESTION API (/events/ingest?async=true)
      │ (Validates schema & attaches requestId/correlationId)
      ▼
TELEMETRY QUEUE (telemetry-ingestion)
      │ (BullMQ queue with exponential backoff & idempotencyKey)
      ▼
QUEUE WORKER (QueueWorker)
      │ 1. Validate organizationId against DB (throws UnrecoverableError if invalid)
      │ 2. Check eventId / idempotencyKey (skips duplicate delivery)
      ▼
CANONICAL EVENT PIPELINE
      ├── Resolve or create Asset (hostname, ipAddress, businessCriticality)
      ├── Persist normalized SecurityEvent plus raw JSON
      ├── Create Alert (title, severity, category, detectionRuleId, matched evidence)
      └── Update Asset risk after alert generation
      │
      ▼
CORRELATION ENGINE (CorrelationService)
      ├── Rule 1: IOC Malicious Value Match
      ├── Rule 2: Multi-Asset Lateral Movement (3+ distinct assets in 1 hour)
      ├── Rule 3: Elevated Risk Grouping (Existing Incident candidate reuse)
      └── Rule 4: Critical Fallback Escalation Queue (alert-escalation)
      │
      ▼
INCIDENT & AUDIT RECORD CREATION
      ├── Create or update correlated Incident
      └── Create AuditLog entry with requestId and correlationId
```

## Canonical Event Contract

Every source follows the same boundary:

```text
RAW EVENT
      -> CONNECTOR PARSER
      -> NORMALIZATION (provenance, identity, network, process, IOC fields)
      -> VALIDATION
      -> DEDUPLICATION
      -> PERSISTENCE (normalized columns plus immutable raw JSON)
      -> DETECTION
      -> CORRELATION
      -> RISK
      -> ALERT / INCIDENT / AUDIT
```

`SecurityEvent.ingestionTimestamp` records when ThreatSync accepted the event; `timestamp` remains the source event time. Source-specific details remain in `metadata` and `rawJson`, while common investigation fields are queryable columns. Sync HTTP ingestion and BullMQ worker ingestion carry the same `IngestEventInput` contract through `EventPipelineService.processEvent()`.

## Detection Rules & Risk Scoring
- **Rule Matching**: Evaluates event properties (`eventType`, `category`, `outcome`, `metadata`) against active tenant `DetectionRule` records.
- **Alert Confidence**: Computed based on detection severity and frequency boost (65–99%).
- **Asset Risk Calculation**:
  $$\text{RiskScore} = \min\left(100, \text{Round}\left(\text{BaseRisk} \times 0.65 + \text{SevWeight} + \text{VulnWeight} + \text{ActiveAlertWeight}\right)\right)$$
  - Severity Weights: Critical (35), High (22), Medium (12), Low (5), Informational (2).
