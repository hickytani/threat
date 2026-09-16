# ThreatSync OS — Architecture Overview

ThreatSync OS is a portfolio project that models a security operations workflow in a multi-tenant monorepo architecture. It is intended to demonstrate strong engineering fundamentals in a local demo environment rather than a live enterprise SOC deployment.

## Monorepo structure

```text
threat/
├── apps/
│   ├── api/          # NestJS backend, auth, queue logic, and domain services
│   └── web/          # Next.js analyst console and dashboard UI
├── packages/
│   ├── database/     # Prisma schema and local data model
│   └── shared-types/ # Shared TypeScript contracts and enums
├── docs/             # project documentation and demo materials
├── README.md
├── package.json
└── tsconfig.json
```

## System layers

### 1. Persistence layer (`packages/database`)
- Prisma models represent the core security workflow: organizations, users, assets, alerts, incidents, events, IOC references, and audit records.
- The schema is designed to support local deterministic workflow demos and PostgreSQL-compatible production-style modeling.
- Seed data provides a realistic local SOC scenario without claiming live enterprise telemetry ingestion.

### 2. Backend layer (`apps/api`)
- NestJS organizes the application into modular services and controllers.
- JWT and organization-aware authorization provide the multi-tenant security model.
- The API normalizes events, enforces duplicate suppression, evaluates rule conditions, correlates related alerts, and records audit events.
- BullMQ and Redis are used for async queue processing when configured in the local environment.

### 3. Shared contracts (`packages/shared-types`)
- Shared TypeScript types define the application’s core interfaces so the frontend and backend remain aligned.
- This reduces drift between UI expectations and API response shapes.

### 4. Analyst console (`apps/web`)
- Next.js renders the investigation dashboard and workflow views.
- The UI focuses on analyst tasks such as reviewing alerts, looking at asset risk, tracing incidents, and reviewing audit history.
- The front end is meant to demonstrate workflow structure and domain understanding rather than imply a production SOC deployment.

## Local intelligence model

The project explicitly separates local intelligence from external provider configuration:

- Local deterministic path: the default path used for portfolio validation and demo work
- External provider path: configuration-dependent and not assumed by default

This is important for honest portfolio communication. The app can demonstrate SOC workflow reasoning without claiming live commercial intelligence feeds or production telemetry.

## Architecture summary

The project is best understood as a local, deterministic security workflow system that shows:

- event normalization and duplicate handling
- rule-based detection logic
- alert and incident correlation
- explainable risk scoring
- analyst-facing investigation workflow
- backend-enforced auditability and tenant-aware access patterns

That makes it a credible engineering portfolio project while staying accurate about what it is and is not.
