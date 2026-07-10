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
