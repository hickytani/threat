# ThreatSync OS — Portfolio Copy & Hiring Materials

Use these snippets for GitHub, portfolio highlights, resume bullets, or interview introductions. Keep the framing technical, grounded, and honest.

---

### 1. One-line project summary
> ThreatSync OS is a local, deterministic SOC investigation platform that demonstrates event ingestion, detection-rule evaluation, alert correlation, asset risk scoring, and auditable incident workflows.

---

### 2. 50-word summary
> ThreatSync OS is a full-stack security operations demo built with Next.js, NestJS, Prisma, and Redis/BullMQ. The platform ingests telemetry, normalizes and deduplicates events, evaluates deterministic detection rules, correlates related alerts into incidents, and records audit trails with tenant-aware backend enforcement.

---

### 3. 100-word portfolio version
> ThreatSync OS is a full-stack security operations platform designed as a local engineering demo for SOC workflow orchestration. Built with Next.js, NestJS, Prisma, and BullMQ/Redis, it demonstrates event normalization, duplicate suppression, rule-based alert generation, and explainable asset risk scoring. Related alerts are correlated into shared incidents based on asset, identity, network, and IOC context, while backend-side authorization and audit logging enforce multi-tenant safety boundaries. The default threat-intelligence path is deterministic and local; external providers can be configured separately when environment support exists.

---

### 4. Resume-ready bullets
- Built a full-stack SOC investigation platform with a NestJS API, Next.js analyst dashboard, Prisma data layer, and Redis-backed async queue processing.
- Implemented tenant-aware authorization, request-scoped validation, and audit logging to model secure multi-tenant access patterns.
- Designed a deterministic event pipeline that normalizes telemetry, suppresses duplicates, evaluates rule conditions, and correlates alerts into incident narratives.
- Created explainable asset risk scoring with per-factor contributors instead of opaque score generation.
- Verified the project locally with automated tests, build checks, and live Redis-backed queue processing for the demo environment.
- Kept the threat-intelligence path explicit: local deterministic intelligence is the default; external providers are configuration-dependent rather than assumed by default.

---

### 5. Technical GitHub intro
> ThreatSync OS is a portfolio project for a security operations workflow: a Next.js analyst console, NestJS backend, Prisma schema, and Redis/BullMQ queue pipeline for telemetry ingestion, rule evaluation, incident correlation, and auditability.

---

### 6. Speaker-friendly interview version
> I built ThreatSync OS to explore how a SOC platform handles the core engineering problems behind alert generation, incident correlation, and tenant-aware access. The project demonstrates how events are normalized, deduplicated, evaluated against rules, and pushed through a Redis-backed worker pipeline before being correlated into investigations. I also emphasize explainable risk scoring and backend-enforced audit trails, while keeping the default threat-intelligence path local and deterministic rather than pretending the app is connected to live enterprise telemetry feeds.

---

### 7. Hiring-manager validation statement
> ThreatSync OS is a strong portfolio project because it demonstrates end-to-end backend and frontend engineering discipline, not because it claims production SOC deployment or live external telemetry feeds. It shows real architectural thinking around authorization, state handling, queueing, and explainability in a security domain.
