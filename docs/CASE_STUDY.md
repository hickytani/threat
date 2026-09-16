# ThreatSync OS — Portfolio Case Study

**Project**: ThreatSync OS
**Focus**: Full-stack security operations workflow demo
**Stack**: Next.js, NestJS, Prisma, Redis/BullMQ, PostgreSQL, TypeScript

---

## 1. Problem statement

Security operations platforms often struggle with a core set of engineering problems: noisy alert generation, weak tenant boundaries, fragmented investigation workflows, and opaque scoring. A common portfolio-quality demo should show that a team understands the architecture behind those workflows without pretending it is a live enterprise SOC deployment.

This project addresses that by modeling a realistic local SOC investigation lifecycle: event normalization, duplicate suppression, rule-driven alert creation, asset risk evaluation, incident correlation, and auditable analyst response.

---

## 2. Project goal

The goal was to build a local, deterministic security operations demo that could show strong engineering fundamentals across backend services, async processing, and investigation workflows. The project emphasizes clarity, structure, and auditability rather than claiming live security telemetry or production SOC operations.

---

## 3. What the system does

ThreatSync OS demonstrates the following core behaviors:

- Event ingestion and normalization into a consistent shape
- Duplicate detection before repeated alerts are created
- Rule-based alert evaluation against explicit conditions
- Correlation of related alerts into an incident narrative
- Explainable risk scoring for affected assets
- Tenant-aware access checks and immutable audit events
- Redis-backed async job processing for queued ingestion work

---

## 4. Key engineering challenges and solutions

### A. Multi-tenant safety boundaries
The project models a common challenge in security products: how to keep tenant data isolated without relying on UI-only checks. The backend enforces authorization through JWT and tenant-aware repository patterns, ensuring every database lookup is bound to the active organization context.

### B. Deterministic alert generation
Rather than building a mock system that creates arbitrary alerts, the project uses explicit event rules and normalized event metadata to decide when a condition is triggered. This makes the demo easier to explain and easier to verify in a portfolio setting.

### C. Investigation flow instead of isolated widgets
The value in a SOC platform is not just a dashboard. It is the ability to move from event → alert → related asset → incident → audit trail. The app demonstrates that workflow across a structured analyst experience.

### D. Explainable scoring
Asset risk is broken into visible contributors instead of an opaque score. That makes the project more credible to a hiring manager because the system demonstrates engineering judgment about explanation and operational traceability.

---

## 5. Threat intelligence model

The project deliberately distinguishes between local deterministic threat intelligence and externally configured provider support.

- Local path: default, deterministic, no external secret dependencies
- External path: available when the environment provides provider configuration

This matters because it keeps the project honest. The app can model SOC investigation workflows without pretending it is connected to a live commercial intelligence feed or an enterprise SIEM/EDR environment.

---

## 6. Architecture decisions

The project intentionally separates synchronous and asynchronous work:

- Frontend: Next.js dashboard and investigation UI
- Backend: NestJS API with validation, guards, and domain logic
- Queue: BullMQ + Redis for asynchronous processing when configured
- Persistence: Prisma ORM with PostgreSQL-friendly schema and local demo data support

This structure makes the project easy to explain and demonstrates real service boundaries rather than a single monolithic script.

---

## 7. Verification and evidence

The local implementation was verified with:

- 76 passing tests across 7 test suites
- successful build checks for the API and web app
- live Redis-backed async job processing in the local environment

These checks matter because they show the project is not only polished visually but also operationally grounded in working backend behavior.

---

## 8. Final assessment

ThreatSync OS is a strong portfolio project because it shows clear engineering practice across security-aware backend design, async job processing, multi-tenant data handling, and explainable investigation workflows. It is best presented as a credible local security operations demo, not as a live enterprise deployment or a production-managed SOC product.
