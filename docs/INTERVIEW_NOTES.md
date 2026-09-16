# ThreatSync OS — Interview Notes for Hiring Managers

These answers are intentionally grounded in the project as implemented. They are designed to sound credible and technical without overstating maturity or claiming live production security infrastructure.

---

### 1. Explain ThreatSync OS in 30 seconds.
**Answer**: ThreatSync OS is a local security operations demo built with Next.js, NestJS, Prisma, and Redis/BullMQ. It models event ingestion, rule-based alerting, incident correlation, asset risk evaluation, and audit logging within a multi-tenant application design. The project is strongest as a portfolio demonstration of backend security patterns and SOC workflow architecture.

### 2. Explain the event ingestion pipeline.
**Answer**: Events enter through the NestJS API, where payloads are normalized and validated. The system then checks for duplicates before evaluating explicit detection rules. Once the rules match, it creates alerts and pushes work into the async queue path for background processing and follow-up correlation.

### 3. How does multi-tenant isolation work?
**Answer**: The application reads organization context from the authenticated session and binds data access to that tenant boundary. This is implemented in the backend as a request-scoped authorization pattern, so queries are filtered by organization rather than trusting client-provided identifiers.

### 4. How do you prevent IDOR or cross-tenant access?
**Answer**: The repository layer and service logic are designed to enforce tenant scope as a backend rule, not as a UI-only assumption. Resource lookups are constrained by the active organization, and the system is structured to fail closed rather than reveal data across boundaries.

### 5. How does deduplication work?
**Answer**: The system normalizes inbound events and checks for a recent duplicate using consistent event content and timestamps. This prevents repeated records from generating noisy or repeated alerts during the demo flow.

### 6. How does the detection logic work?
**Answer**: The project uses deterministic rule evaluation against explicit conditions like event type, source, outcome, and related context. Alerts are only created when those conditions match; there is no reliance on opaque model scoring in the core workflow.

### 7. How does incident correlation work?
**Answer**: The project correlates alerts into an incident narrative using related factors such as shared asset context, network indicators, identity, and time proximity. This gives the investigation flow structure and helps explain how a larger case emerges from individual events.

### 8. How is asset risk calculated?
**Answer**: Risk is calculated with factor-based contributors so the score is explainable. The UI and backend expose the contributors rather than simply showing a single opaque value.

### 9. Why use BullMQ and Redis?
**Answer**: For asynchronous ingestion, it is useful to decouple request handling from follow-on processing. BullMQ gives the project a concrete queue worker pattern, and Redis provides a standard service boundary for background jobs in a local environment.

### 10. How is the queue path validated?
**Answer**: The project includes a verified local queue flow in which an async event ingest request is accepted and processed through the worker path with a real job ID. This is part of the portfolio-level validation rather than a production-scale deployment claim.

### 11. What about threat intelligence?
**Answer**: The project clearly distinguishes local deterministic intelligence from externally configured providers. The default path is local and deterministic, which is ideal for demos and verification. External providers are left as configuration-dependent rather than assumed as a default runtime dependency.

### 12. What are the biggest current limitations?
**Answer**: The app models a realistic SOC workflow but does not claim live enterprise telemetry ingestion, live EDR feed connection, or production deployment. It is a local engineering demo focused on backend architecture, workflows, and security-minded design decisions.

### 13. Why is this a good portfolio project?
**Answer**: It demonstrates a complete stack across frontend, backend, persistence, queueing, authorization, and auditability. That combination is a strong signal to a hiring manager because it shows actual engineering breadth, not just a single component built in isolation.

### 14. How would you describe the project during a hiring conversation?
**Answer**: I would describe it as a local security operations platform prototype that exercises the important architecture of event-driven investigation workflows: normalized ingestion, rule evaluation, incident correlation, explainable risk scoring, and auditable backend behavior. It is valuable because it demonstrates engineering judgment in a security domain, while remaining honest about the fact that it is not a live enterprise SOC deployment.

### 15. What would you improve next?
**Answer**: I would add more production-aware operational concerns like deeper deployment automation, stronger environment configuration discipline, and expanded observability. But those would be enhancements to the operational maturity of the project, not changes to the existing portfolio scope or code architecture.
