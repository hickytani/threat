# ThreatSync OS — 60-90 Second Walkthrough Script

This script is designed for recording a concise, natural, and technical demonstration video of ThreatSync OS. Speak in a clear, measured engineer-to-engineer tone.

---

### [0:00 - 0:10] Introduction & Core Value
> **Visual**: Landing page / SOC Overview (`/dashboard`)
>
> **Script**:
> *"ThreatSync OS is a full-stack security operations and incident investigation platform. It normalizes security telemetry, evaluates deterministic detection rules, correlates alerts into evidence-backed incidents, and maintains full tenant isolation and audit logging."*

---

### [0:10 - 0:25] SOC Overview & Pipeline Flow
> **Visual**: Click on `/dashboard` Overview widgets and pipeline cards.
>
> **Script**:
> *"On the Overview dashboard, analysts get a real-time summary of active security alerts, open incidents, and high-risk assets. Security events move through a multi-stage pipeline: normalization, deduplication, detection evaluation, and correlation."*

---

### [0:25 - 0:40] Primary Alert & Detection Evidence
> **Visual**: Navigate to `/dashboard/alerts` and click on the primary critical alert (`Suspicious Credential Dumping via LSASS Access`).
>
> **Script**:
> *"Opening this critical alert, we can see the exact evidence that triggered it: raw security event IDs, process parameters, user context, and the deterministic rule logic that fired. There are no fabricated metrics—alerts map directly to explicit telemetry."*

---

### [0:40 - 0:55] Incident & Correlation Timeline
> **Visual**: Click on the linked Incident link (`INC-2026-001` or `/dashboard/incidents/[id]`).
>
> **Script**:
> *"From the alert, we pivot directly into the correlated Incident console. The system automatically linked multiple alerts based on shared identity, network indicators, and temporal proximity, presenting a unified, chronological investigation timeline."*

---

### [0:55 - 1:10] Asset Risk Contributors
> **Visual**: Click on the affected Asset (`DB-PROD-01` or `/dashboard/assets/[id]`).
>
> **Script**:
> *"Pivoting to the affected asset, ThreatSync exposes an explainable risk score out of 100. Rather than presenting an opaque magic number, the UI breaks down exact risk contributors: base business criticality, active alert severity, and open CVE vulnerability weightings."*

---

### [1:10 - 1:20] IOC & Intelligence Provider Abstraction
> **Visual**: Click on the related IOC IP/Hash (`/dashboard/ioc/[id]`).
>
> **Script**:
> *"Inspecting this IP indicator, threat intelligence lookups are abstracted behind a clean provider interface. Here, the system indicates data was enriched using our local deterministic provider fallback, distinguishing offline rules from external REST APIs."*

---

### [1:20 - 1:30] Response State Transition & Audit Trail
> **Visual**: Change Incident status to `IN_PROGRESS` or `RESOLVED`, then navigate to `/dashboard/audit`.
>
> **Script**:
> *"Finally, when an analyst transitions an incident state, the action is authoritatively processed backend-side and recorded in an immutable audit trail, providing complete compliance and forensic traceability across the organization."*
