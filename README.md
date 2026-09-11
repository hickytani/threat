# ThreatSync OS

> **Detect faster. Investigate smarter. Respond confidently.**

ThreatSync OS is a production-quality, multi-tenant defensive security operations platform (SOC) designed for small and medium-sized organizations that cannot afford a complete enterprise SOC. It consolidates security alerts, asset registries, vulnerability databases, and IOC forensics in a unified dashboard, featuring custom JWT session security, database-enforced tenant guards, and AI playbook recommendations.

---

## Key Features

- **Centralized Security Overview:** Interactive KPI cards tracking telemetry parameters (active alerts, critical vulnerability CVE counts, MTTR logs) and dynamic charts (Recharts trends).
- **Multi-Tenant Isolation:** Every dataset includes an `organizationId` index; access controls are verified by a NestJS `TenantGuard` to prevent unauthorized cross-tenant retrieval.
- **Cookie-Based Custom Auth:** Password hashing via `bcryptjs`, and tokens stored in secure, `HttpOnly`, `SameSite=Lax` cookies with automatic rotation and session database logs.
- **Forensic Investigator Workspace:** On-demand indicators of compromise (IOC) checks (IP, domain, hash, CVE) with reputation parsing and caching.
- **Incident Command Center:** Live checklist task trackers, analyst log updates, evidence file vault checks, and post-incident review (PIR) reports.
- **Detection & Correlation Engine:** Ingested security events are normalized, deduplicated, matched against enabled detection rules, and optionally escalated into correlated incidents.
- **Risk & Intelligence Layer:** Asset risk scoring, IOC enrichment, alert-to-incident correlation, and queue-driven workflow automation are implemented in the backend.
- **Compliance Audit Trail:** Immutable records capturing administrative changes.

---

## Tech Stack

### Frontend
- **Framework:** Next.js (App Router) with React & TypeScript
- **Styling:** Vanilla Tailwind CSS with custom dark desaturated theme design
- **State & Feeds:** Zustand client state, native fetch hooks
- **Visuals:** Recharts visualizations, Lucide icons

### Backend
- **Framework:** NestJS API gateway with REST module controllers
- **ORM & Database:** Prisma client targeting PostgreSQL with tenant-scoped models, queue workers, and deterministic seed data
- **Security:** JWT session validation, tenant enforcement, request IDs, cookie-parser, class-validator, and structured error handling

---

## Workspace Layout

```text
threatsync-os/
├── apps/
│   ├── api/          # NestJS backend core, auth controllers, seeder tools
│   └── web/          # Next.js App Router front-end, onboarding wizard, ledger grids
├── packages/
│   ├── database/     # Prisma database schemas, seed configurations
│   └── shared-types/ # Common TypeScript types shared between web and api
├── docs/             # Project status logs and ADR decisions records
├── package.json      # Workspace runner config
└── .env              # Active dev environment database parameters
```

---

## Local Development Setup

Follow these steps to initialize and start the platform locally:

### 1. Install Dependencies
Run from the monorepo root directory:
```bash
npm install
```

### 2. Configure local services
Make sure PostgreSQL and Redis are available locally, then copy the example environment file and adjust credentials if needed:
```bash
copy .env.example .env
```

### 3. Generate Prisma Client & Sync Database
Generate the TypeScript mappings and push the schema to the configured PostgreSQL database:
```bash
npm run db:generate
npm run db:push
```

### 4. Compile Shared Packages
Build shared type modules:
```bash
npm run build --workspace=packages/shared-types
npm run build --workspace=packages/database
```

### 5. Seed baseline credentials
Populate the database with the default SOC demo organization and login account:
```bash
npm run db:seed
```

### 6. Launch both Servers
Start the NestJS API and Next.js frontend concurrently in development mode:
- Run API (listening on `http://localhost:3001/api/v1`):
  ```bash
  npm run dev:api
  ```
- Run Web app (listening on `http://localhost:3000`):
  ```bash
  npm run dev:web
  ```

---

## Testing Credentials

Use the pre-seeded credentials to access the SOC command room:

- **Email:** `analyst@threatsync.local`
- **Password:** `ThreatSyncSecured2026!`

---

## Defensive Security Scope

ThreatSync OS is **strictly defensive**. It contains only monitoring and audit tools. It does **not** feature malware samples, credentials bypass mechanisms, payload vectors, reverse shell code, or ransomware playbooks. All uploads are scanned in memory via mock abstractions.
