# Security Policy — ThreatSync OS

## Defensive Purpose Only

ThreatSync OS is built exclusively as a defensive security operations hub for monitoring assets, vulnerability catalogs, alerts, and incident ticketing. 

It **strictly prohibits** the ingestion or upload of:
- Actual malware binaries, payloads, or ransomware structures.
- Active credential phishing databases.
- Offensive scanning routines or exploit instructions.

Any violation of these guidelines is a misuse of the platform.

## Reporting a Vulnerability

We take the security of this defensive codebase seriously. If you discover a vulnerability in the authentication guards, tenant isolation filters, or session cookie logic, please do **not** file a public issue on GitHub.

Instead, report it via encrypted channels to:
`defensive-security@threatsync.local`

Please include:
1. Steps to reproduce the vulnerability (proof-of-concept description).
2. Affected routes or parameters (e.g., cross-tenant validation bypasses).
3. Suggested patches if available.

## Secrets Handling

Never check credentials, API tokens, or session keys into source control. All configurations must be loaded dynamically using environment variables from the `.env` file. We encrypt sensitive external credentials at rest before writing them to the database.

## Public Deployment Controls

- Browser sessions use HTTP-only cookies and are bound to a database session and active organization membership.
- Telemetry ingestion uses separate organization-scoped `ts_ing_` credentials. Only a hash and display prefix are stored; the full token is returned once at creation.
- Production startup requires PostgreSQL, Redis, refresh/session secrets, and disables the in-memory queue fallback.
- Demo seeding is disabled unless explicitly enabled in a non-production environment.
- Authentication, ingestion, and intelligence routes have configurable per-process rate limits. Multi-replica deployments must also enforce distributed or edge rate limiting.
- Request IDs are included in API error responses for investigation and support.

These controls are implementation safeguards, not a claim of completed compliance certification or a substitute for an independent production security review.
