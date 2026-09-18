# ThreatSync OS — Production Environment Configuration Contract

This document is the authoritative specification of every environment variable required to deploy ThreatSync OS in production (`NODE_ENV=production`). The API process calls `validateEnv()` at startup and will **exit immediately** if any required variable is missing, weak, or contradictory.

---

## 1. Required Production Variables

| Variable | Minimum | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | — | Must be `production`. |
| `DATABASE_URL` | — | PostgreSQL connection URI, e.g. `postgresql://user:pass@host:5432/threatsync?schema=public`. |
| `REDIS_URL` | — | Redis connection URI, e.g. `redis://host:6379`. **Required in production.** |
| `JWT_SECRET` | 32 chars | Signs access tokens. Must not contain: `secret`, `password`, `default`, `change_in_production`. |
| `JWT_REFRESH_SECRET` | 32 chars | Signs refresh tokens. Alias: `REFRESH_TOKEN_SECRET`. Must not reuse `JWT_SECRET` value. |
| `SESSION_SECRET` | 16 chars | Cookie session protection. Must not contain weak keywords. |
| `FRONTEND_URL` | — | Exact origin of the Next.js frontend, e.g. `https://app.threatsync.io`. Controls CORS. Alias: `WEB_PUBLIC_URL`. |
| `NEXT_PUBLIC_API_URL` | — | Public API base URL baked into the Next.js build, e.g. `https://api.threatsync.io/api/v1`. **Set at BUILD TIME.** |

---

## 2. Forbidden in Production

| Variable | Value | Reason |
| :--- | :--- | :--- |
| `ENABLE_IN_MEMORY_QUEUE_FALLBACK` | `"true"` | Silently drops events when Redis is unavailable. **Blocked on startup.** |
| `ALLOW_DEMO_SEED` | `"true"` | Would allow demo data injection into production tenants. **seed.ts blocks `NODE_ENV=production`.** |
| `DISABLE_QUEUE_WORKER` | not recommended to omit | Set to `"true"` when running dedicated worker containers; leave unset when API should process jobs itself. |

---

## 3. Optional Variables

| Variable | Description |
| :--- | :--- |
| `PORT` | HTTP port for the NestJS API process. Defaults to `3001`. |
| `VIRUSTOTAL_API_KEY` | Enables live VirusTotal IP/hash enrichment. |
| `ABUSEIPDB_API_KEY` | Enables live AbuseIPDB threat intelligence feed. |
| `DISABLE_QUEUE_WORKER` | Set `"true"` when running a separate dedicated worker container. |

---

## 4. Rate-Limiting Variables

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `AUTH_RATE_LIMIT_MAX` | `10` | Max login/register requests per window per client |
| `AUTH_RATE_LIMIT_WINDOW_MS` | `900000` (15 min) | Auth rate window |
| `INGEST_RATE_LIMIT_MAX` | `300` | Max direct ingestion events per window |
| `INGEST_RATE_LIMIT_WINDOW_MS` | `60000` (1 min) | Ingestion window |
| `WEBHOOK_RATE_LIMIT_MAX` | `300` | Max webhook ingestion events per window |
| `WEBHOOK_RATE_LIMIT_WINDOW_MS` | `60000` (1 min) | Webhook window |
| `INTELLIGENCE_RATE_LIMIT_MAX` | `60` | Max threat intel lookups per minute |

---

## 5. Secret Generation

```bash
# Generate strong secrets using openssl:
openssl rand -base64 48
```

Run this three times to get distinct values for `JWT_SECRET`, `JWT_REFRESH_SECRET`, and `SESSION_SECRET`. **Never share secrets between roles or environments.**

---

## 6. Startup Failure Conditions

The API will terminate with a non-zero exit code if **any** of the following are true in production:

1. `DATABASE_URL` is missing.
2. `JWT_SECRET` is shorter than 32 characters or contains weak keywords.
3. `REDIS_URL` is missing.
4. `ENABLE_IN_MEMORY_QUEUE_FALLBACK` is `"true"`.
5. `JWT_REFRESH_SECRET` (or `REFRESH_TOKEN_SECRET`) is missing.
6. `SESSION_SECRET` is missing.
7. `FRONTEND_URL` (or `WEB_PUBLIC_URL`) is missing.
8. Any secret contains: `change_in_production`, `secret`, `default`, `password`, `threatsync_prod_secret`, `12345678`.

---

## 7. Secret Logging Policy

- Secrets are **never** printed to logs or console output.
- Database query errors are masked behind a generic message in production.
- Internal stack traces are suppressed in production API responses.
- Ingestion tokens are stored as SHA-256 hashes; only the token prefix is persisted.
- Passwords are hashed with bcrypt cost factor 12.
- Webhook secrets are stored as SHA-256 hashes.

---

## 8. Reverse Proxy / HTTPS

When deployed behind a reverse proxy (Nginx, Caddy, AWS ALB, Cloudflare):

- Set `trust proxy: 1` (already enabled in production — see `main.ts`).
- Ensure `FRONTEND_URL` matches the public-facing HTTPS origin exactly (protocol, hostname, port).
- The reverse proxy must forward `X-Forwarded-For` and `X-Forwarded-Proto` headers.
- `Strict-Transport-Security` is automatically added to all responses in production.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full reverse proxy topology.
