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
ATOMIC PRISMA TRANSACTION ($transaction)
      ├── Resolve or create Asset (hostname, ipAddress, businessCriticality)
      ├── Create Alert (title, severity, category, detectionRuleId, rawEvent)
      └── Increment Asset activeAlertCount
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

## Detection Rules & Risk Scoring
- **Rule Matching**: Evaluates event properties (`eventType`, `category`, `outcome`, `metadata`) against active tenant `DetectionRule` records.
- **Alert Confidence**: Computed based on detection severity and frequency boost (65–99%).
- **Asset Risk Calculation**:
  $$\text{RiskScore} = \min\left(100, \text{Round}\left(\text{BaseRisk} \times 0.65 + \text{SevWeight} + \text{VulnWeight} + \text{ActiveAlertWeight}\right)\right)$$
  - Severity Weights: Critical (35), High (22), Medium (12), Low (5), Informational (2).
