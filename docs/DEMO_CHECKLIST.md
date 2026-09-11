# ThreatSync OS — Demo Recording Checklist

Follow this checklist to prepare and record a seamless 60–90 second technical walkthrough video.

---

### 1. Pre-Recording System Verification

Before hitting record, complete these environment checks:

- [ ] **Database Running**: Verify PostgreSQL database is accessible via Prisma (`npm run prisma:generate` / seed status).
- [ ] **Redis Service**: (Optional/Prod Mode) Verify Redis server is running on `127.0.0.1:6379` if testing BullMQ queue worker paths.
- [ ] **Database Seeded**: Execute `npm run seed -w apps/api` to load the primary deterministic SOC scenario (`Acme Corp` tenant).
- [ ] **API Running**: Verify NestJS backend is active (`http://localhost:3001/api/v1/health` returns status `ok`).
- [ ] **Web Server Running**: Verify Next.js frontend is active (`http://localhost:3000`).
- [ ] **User Session**: Log in as `analyst@acme.com` / `Password123!` and navigate to `/dashboard`.
- [ ] **Primary Scenario Check**:
  - [ ] Alert: `Suspicious Credential Dumping via LSASS Access` present under `/dashboard/alerts`
  - [ ] Incident: `INC-2026-001 - Active Credential Access Campaign` present under `/dashboard/incidents`
  - [ ] Asset: `DB-PROD-01` with risk score breakdown present under `/dashboard/assets`
  - [ ] IOC: `192.168.1.105` or file hash lookup functional under `/dashboard/ioc`
  - [ ] Audit: Verify recent audit events populate on `/dashboard/audit`

---

### 2. Recording Page Order

Maintain this exact navigation flow during the recording to avoid unnecessary backtracking:

1. `/` (Landing Page Overview — 5 seconds)
2. `/dashboard` (SOC Overview — 15 seconds)
3. `/dashboard/alerts/[id]` (Alert Investigation Console — 15 seconds)
4. `/dashboard/incidents/[id]` (Incident Correlation Timeline — 15 seconds)
5. `/dashboard/assets/[id]` (Asset Risk & Contributors — 15 seconds)
6. `/dashboard/ioc/[id]` (IOC Threat Intelligence — 10 seconds)
7. `/dashboard/audit` (Auditable State Transitions & Compliance — 10 seconds)

---

### 3. Recording Rules & Best Practices

- **Deliberate Cursor Movement**: Move the cursor smoothly and purposefully toward targeted navigation items.
- **No Unnecessary Scrolling**: Keep page scroll minimal and aligned with what is being described spoken.
- **No Terminal Wandering**: Keep full screen focused on the browser interface; don't switch to terminal windows mid-demo.
- **Browser Zoom**: Set browser zoom to **110% or 125%** so typography and risk badges remain sharp on video.
- **No Confidential Data**: Ensure local environment variables (`.env`) or internal system paths are not displayed on screen.
- **No Artificial Delays**: Leverage pre-seeded cache and local API responses for crisp transition speed.
