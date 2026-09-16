# Project Status — ThreatSync OS

## Project Metadata
- **Current Phase:** Phase 2 — Productionization (In progress)
- **AI Engine Fallback:** Enabled (Mock fallback active)
- **Database Fallback:** Supported (SQLite dev.db active)
- **Redis Queue Fallback:** Supported (In-Memory fallback active)

## Completed Features
- **Root Monorepo Setup:** config workspace workspaces configuration, TS compiler config, and global environment maps.
- **Shared Types:** Centralized domain interfaces (`User`, `Organization`, `Asset`, `Alert`, `Incident`, `IOC`, `Vulnerability`) shared between backend/frontend.
- **Database Model (Prisma):** Generic schema models optimized for SQLite and PostgreSQL. Built-in indexes and relations.
- **Custom Authentication Module:** Cookie-based HTTP-Only sessions, bcryptjs password hashes, dynamic token rotation, and database session tracking.
- **Tenant Security Guard:** Dynamic `TenantGuard` verifying active organizational membership. Passed verification tests.
- **Public & Onboarding Forms:** Polished landing page, interactive login/register forms, and multi-step Onboarding Setup Wizard with seeder triggers.
- **Machine Ingestion Credentials:** Organization-scoped, hashed, revocable credentials with authenticated event ingestion.
- **Operational Dashboard:** Tenant-scoped metrics with foreground polling and explicit empty-workspace states.
- **Deployment Boundaries:** Production validation rejects missing Redis and unsafe demo-seed configuration.

## Current Phase Roadmap (Phase 2 — Productionization)
- [x] Harden environment validation and runtime config resilience
- [x] Strengthen session-to-tenant binding and active organization context
- [x] Extend event pipeline detection suppression and rule state tracking
- [x] Expand API contract and documentation coverage
- [ ] Complete end-to-end build/test verification for deployment artifacts and release notes
- [ ] Add production SSO/MFA, distributed rate limiting, connector operations, and separate worker bootstrap

## Known Issues
- Production deployment still assumes a PostgreSQL-backed runtime with optional Redis, but local development continues to use in-memory fallback behavior.
- The frontend uses 30-second foreground polling; SSE/WebSocket streaming is not active.
- The current worker is initialized with the API process; a separate worker entrypoint is still needed for independent deployment.

## Technical Debt
- The current queue setup uses in-memory mocks for local development and should remain explicit about fallback expectations in release documentation.
- The API contract docs should continue to be updated alongside controller/service changes.

## Next Tasks
- Add deployment manifests, health checks, and CI release validation for the API and web apps.
- Expand tests for more tenant-scoping and rule-suppression edge cases.
