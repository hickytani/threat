# ThreatSync OS — SOC Investigation Specifications

ThreatSync OS provides dedicated investigation consoles for Incidents, Alerts, Assets, IOCs, and Events, enabling SOC analysts to trace threats across all related security entities.

## Entity Tracing & Relationships

| Entity | Primary Investigation Route | Traceable Relationships Exposed |
|---|---|---|
| **Alert** | `/dashboard/alerts/:id` | Detection Rule → Matched Conditions → Triggering Events → Affected Asset → Actor → Network Footprint → IOC → Linked Incident |
| **Incident** | `/dashboard/incidents/:id` | Incident → Related Alerts → Triggering Events → Affected Assets → Users/Actors → Related IOCs → Vulnerabilities → Audit Trail → Timeline |
| **Asset** | `/dashboard/assets/:id` | Asset Posture → Risk Contributors → Recent Events → Active Alerts → Linked Incidents → Open Vulnerabilities → Related IOCs → Timeline |
| **IOC** | `/dashboard/ioc/:id` | IOC Value/Type → Local vs External Intelligence Distinction → Observed Events → Alerts → Incidents → Affected Assets → Timeline |
| **Event** | `/dashboard/explorer` | Server-Side Search Filters → Pagination Envelopes → Raw JSON Drawer → Threat Propagation Canvas |

## Reusable Investigation Timeline (`InvestigationTimeline.tsx`)

The deterministic investigation timeline aggregates heterogeneous database records into a single chronological activity sequence:

1. `SECURITY_EVENT`: Telemetry log entries.
2. `ALERT`: Detection rule trigger events.
3. `INCIDENT_TRANSITION`: Incident lifecycle status changes.
4. `INTELLIGENCE_ACTIVITY`: IOC queries and enrichment results.
5. `AUDIT_LOG`: Compliance audit trail events.
6. `COMMENT`: Analyst notes and triage observations.
7. `TASK`: Playbook response checklist items.
