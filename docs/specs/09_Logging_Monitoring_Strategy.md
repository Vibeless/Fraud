# Logging & Monitoring Strategy

*LMS — Logging & Monitoring Strategy*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** TAS v1.0, SRS v1.0 (NFRs, FR-010 audit), Deployment Architecture v1.0, X API Capability Analysis v1.0

## 1. Purpose

Defines what Campaign Integrity API logs, measures, and alerts on — covering the request path, the async Detection Engine pipeline, and dependencies on X’s API — so operational issues and detection-quality regressions are both visible before an agency has to report them.

## 2. Structured Logging

### 2.1 Format

- All logs are structured JSON (one event per line), never freeform strings, so they are queryable in the log aggregator without parsing.

- Every log line includes: timestamp, level, service (api \| worker \| frontend), and, where applicable, a correlation/request id.

- A single correlationId is generated at the API edge for every incoming request and propagated through to the BullMQ job it enqueues, so one submission’s full journey — HTTP request → queue → collector → analyzers → aggregator → response — can be traced with one query.

### 2.2 What Is Never Logged

- Secrets: API key values, password hashes, JWT signing key, refresh tokens.

- Full request/response bodies containing credentials.

- This applies even inside error stack traces (SRS security requirement) — log interceptors redact known-sensitive fields before serialization.

### 2.3 Log Levels

| **Level** | **Used For**                                                                         |
|-----------|--------------------------------------------------------------------------------------|
| error     | Unhandled exceptions, failed analyses, X API failures that exhaust retries           |
| warn      | Retried X API calls, rate-limit near-misses, degraded/partial evidence               |
| info      | Request completion, submission created, analysis completed, job lifecycle events     |
| debug     | Rule-level execution detail — enabled only in dev/staging, not production by default |

## 3. What Gets Logged, by Layer

| **Layer**             | **Key Events**                                                                                                                            |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------|
| API                   | Every request: method, path, status code, duration, callerType (api_key/jwt), agencyId (never the raw key/token)                          |
| Auth                  | Login success/failure, token refresh, api_key created/revoked (also written to audit_logs per FR-010)                                     |
| Pipeline orchestrator | Stage transitions per submission: collected → validated → analyzing → aggregated → completed/failed, with duration per stage              |
| Analyzers             | Analyzer start/end + duration; rule execution errors (not routine rule outcomes — too high-volume for logs, captured as Findings instead) |
| X integration         | Every X API call: endpoint, status, latency, and remaining rate-limit budget from response headers                                        |
| Queue                 | Job enqueued/started/completed/failed/retried, queue depth snapshots                                                                      |

## 4. Metrics

### 4.1 Golden Signals (API)

- Request rate, error rate, and latency (p50/p95/p99) per endpoint.

- Rate-limit rejections per API key (surfaces agencies hitting limits before they file a support ticket).

### 4.2 Pipeline & Detection Engine

- End-to-end analysis duration (submission created → analysis completed) — the metric closest to what an agency actually experiences.

- Per-analyzer execution duration, to catch a single analyzer regressing before it drags down the whole pipeline.

- Queue depth and oldest-job age, the earliest signal of a backlog forming.

- Analysis failure rate and failure reason breakdown.

- Risk Score distribution over time (not a health metric, but a detection-quality signal — a sudden shift can indicate a rule regression or an upstream X data change).

### 4.3 X API Dependency

- X API call volume, error rate, and remaining rate-limit budget, per the constraints identified in the X API Capability Analysis.

- Cache hit ratio for cached X responses — a falling hit ratio often precedes a rate-limit problem.

### 4.4 Infrastructure

- CPU/memory per tier, instance count, Postgres connection pool utilization, Redis memory usage.

## 5. Alerting

| **Signal**               | **Threshold (indicative)** | **Severity**                    |
|--------------------------|----------------------------|---------------------------------|
| API error rate           | \> 2% over 5 min           | Page                            |
| API p95 latency          | \> 1.5s over 5 min         | Page                            |
| Queue oldest-job age     | \> 10 min                  | Page                            |
| Analysis failure rate    | \> 5% over 15 min          | Page                            |
| X API error rate         | \> 10% over 5 min          | Warn → Page if sustained 15 min |
| X API rate-limit budget  | \< 10% remaining           | Warn                            |
| Postgres connection pool | \> 80% utilized            | Warn                            |
| Disk / memory            | \> 85% utilized            | Warn                            |

Thresholds are starting points, tuned after the pilot deployment establishes real baselines (see PRD success criteria).

## 6. Error Tracking

- Unhandled exceptions in the API and worker are captured with full stack trace, correlationId, and (redacted) request context in a dedicated error-tracking tool, separate from routine logs, so regressions are triaged as issues rather than lost in log volume.

- Frontend runtime errors are captured the same way, tagged with the dashboard route and user role (not user identity) for reproduction.

## 7. Tooling (indicative)

| **Concern**              | **Tool**                                                                              |
|--------------------------|---------------------------------------------------------------------------------------|
| Structured logging       | Pino (NestJS) / native Next.js logging, shipped as JSON                               |
| Log aggregation & search | Centralized log platform (e.g. Loki, ELK, or a managed equivalent)                    |
| Metrics & dashboards     | OpenTelemetry instrumentation → Prometheus → Grafana (or a managed equivalent)        |
| Error tracking           | Sentry or equivalent                                                                  |
| Alerting                 | Alertmanager / the observability platform’s native alerting, routed to on-call paging |

## 8. Retention

- Application logs: 30 days hot, archived thereafter.

- audit_logs (database table, FR-010): retained indefinitely as the durable compliance record — distinct from and longer-lived than operational log retention.

- Metrics: 13 months, to support year-over-year comparison.
