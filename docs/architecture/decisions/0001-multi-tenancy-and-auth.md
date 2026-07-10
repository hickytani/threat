# ADR 0001: Multi-Tenancy and Authentication Strategy

## Context
ThreatSync OS is designed as a multi-tenant defensive security platform. It requires isolation of data between different organizations and a robust authentication method that handles API requests and Next.js frontend rendering securely.

## Decision
1. **Multi-Tenancy Isolation:**
   - Every database model that is organization-scoped will include an `organizationId` column.
   - All backend routes that fetch or modify tenant data must validate that the authenticated user belongs to the target organization using a `TenantGuard`.
   - Raw SQL or Prisma operations will include explicit `organizationId` filters in all queries.

2. **Authentication Flow:**
   - Custom session-based authentication utilizing JSON Web Tokens (JWT).
   - The NestJS API will issue two tokens upon login:
     - **Access Token:** Stored in a secure, `HttpOnly`, `SameSite=Lax` cookie. Short validity (15 mins). Used for authorizing REST requests, Next.js Server Components, and WebSockets.
     - **Refresh Token:** Stored in a secure, `HttpOnly`, `SameSite=Lax` cookie. Longer validity (7 days) and stored in the database. Used to request a new Access Token.
   - Using cookies simplifies integration with Next.js Server Components, which can automatically pass the request cookie to backend requests.

## Consequences
- **Pros:** Zero client-side token exposure to XSS, easy support for Next.js SSR, server-side session revocation.
- **Cons:** Standard CSRF considerations, mitigated by setting `SameSite=Lax` (and optionally CORS settings).
