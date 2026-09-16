# ThreatSync OS — 60-90 Second Demo Script

This is a concise, hiring-manager-friendly walkthrough for demonstrating the project without overstating its maturity or claiming production deployment.

---

### [0:00 - 0:15] Intro and framing
> **Visual**: Landing page / dashboard overview
>
> **Script**:
> *"This is ThreatSync OS, a local portfolio project that models a SOC investigation workflow. It demonstrates how a security platform could ingest events, evaluate rules, correlate alerts, and maintain auditable investigation records in a structured backend."*

---

### [0:15 - 0:35] Event flow and detection
> **Visual**: Open the dashboard and show alert/event data
>
> **Script**:
> *"The project ingests telemetry into a normalized event model, checks for duplicates, and evaluates explicit detection rules against event attributes. In other words, the alerting logic is deterministic and explainable instead of being a black box."*

---

### [0:35 - 0:55] Correlation and incident workflow
> **Visual**: Open an alert and pivot into the incident or asset view
>
> **Script**:
> *"Once alerts are created, the system correlates related events into a broader incident narrative using shared context like asset, identity, network indicators, and timeline proximity. The analyst console then shows how that evidence is grouped into a single investigation flow."*

---

### [0:55 - 1:15] Risk and auditability
> **Visual**: Show asset risk score and audit trail
>
> **Script**:
> *"On the asset side, risk is not just a single opaque number. The app breaks down contributors so an analyst can see why an asset is elevated. And every status update is recorded in an audit log so investigation changes remain traceable and backend-authoritative."*

---

### [1:15 - 1:30] Local intelligence clarification
> **Visual**: Highlight the local threat-intelligence context or provider abstraction
>
> **Script**:
> *"A key detail is that the default intelligence path is local and deterministic for the demo. External providers can be configured separately when a runtime environment provides those credentials, but this project does not assume live SIEM or EDR feeds or a production deployment."*

---

### Short closing line
> *"So the value here is not pretending to run a live SOC. It is showing strong engineering fundamentals across backend security, async processing, event-driven logic, and investigation workflows in a portfolio-friendly implementation."*
