# ThreatSync OS Architecture Overview

This document details the software design, container flows, authentication mechanisms, and tenant isolation strategies of ThreatSync OS.

---

## 1. System Container Flow

ThreatSync OS is structured as a decoupled monorepo, keeping business controllers isolated from client components:

```mermaid
graph TD
  User([SOC Analyst / Compliance Auditor]) -->|HTTPS / Secure Cookies| NextJS[Next.js Frontend Client - Port 3000]
  NextJS -->|REST API Requests / Headers| NestJS[NestJS REST API Gateway - Port 3001]
  NestJS -->|Prisma Client| DB[(SQLite Database File - dev.db)]
```

- **Frontend Client:** Next.js Server Components load state profiles, and Client Components handle real-time interactions, Recharts renderings, and forms.
- **REST API Gateway:** NestJS services parse requests, validate input validation constraints (class-validator), check session contexts, and query records.
- **ORM & Database:** Prisma intercepts queries and translates schemas.

---

## 2. Authentication Flow

Authentication is executed through secure cookie verification to prevent XSS exposure:

```mermaid
sequenceDiagram
  autonumber
  Analyst->>NestJS: POST /auth/login {email, password}
  NestJS->>NestJS: Verify credentials via bcryptjs
  NestJS->>NestJS: Generate short access JWT & long refresh JWT
  NestJS->>DB: Record session token with expiration limits
  NestJS->>Analyst: Set HttpOnly cookie headers & return user metadata
  Note over Analyst, NestJS: Next.js Client sends automatic cookie header on sub-queries
```

---

## 3. Tenant Isolation & RBAC Guard Pipeline

To prevent cross-tenant information disclosure, every request targeting organizational data is parsed through a strict validation chain:

```mermaid
graph LR
  Req[Incoming API Request] -->|Step 1| JwtGuard{JwtAuthGuard}
  JwtGuard -->|Valid Token| TenantGuard{TenantGuard}
  JwtGuard -->|Invalid| Unauthorized[401 Unauthorized]
  TenantGuard -->|Valid Org Membership| RolesGuard{RolesGuard}
  TenantGuard -->|Denied| Forbidden[403 Forbidden]
  RolesGuard -->|Permitted role| Handler[Controller Router Handler]
  RolesGuard -->|Role mismatch| Deny[403 Denied]
```

- **JwtAuthGuard:** Extracts access tokens from request cookies or bearer headers, verifies signatures, and resolves the User identity context.
- **TenantGuard:** Extracts target organization ID (from headers, routes, queries, or body parameters). Queries database memberships to verify user access; attaches organization metadata to request parameters.
- **RolesGuard:** Compares user organization roles against controller metadata configs.
