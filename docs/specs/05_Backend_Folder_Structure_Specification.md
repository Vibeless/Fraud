# Backend Folder Structure Specification

*BFS — Backend Folder Structure*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** TAS v1.0 (NestJS, modular Detection Engine), Rule Library Specification v1.0, Detection Engine Specification v1.0

## 1. Purpose

This document defines the NestJS backend project layout so that the module boundaries described in the Technical Architecture Specification — particularly the separation between API modules, the Detection Engine, and the rule library — are reflected directly in the codebase, not just in a diagram.

## 2. Top-Level Layout
```
campaign-integrity-api/
├─ src/
│ ├─ main.ts
│ ├─ app.module.ts
│ ├─ common/
│ ├─ config/
│ ├─ database/
│ ├─ queue/
│ └─ modules/
├─ test/
├─ .env.example
├─ docker-compose.yml
├─ Dockerfile
└─ package.json
```
## 3. src/common — Cross-Cutting Concerns
```
common/
├─ guards/
│ ├─ api-key.guard.ts // validates Authorization: Bearer <api_key>
│ ├─ jwt.guard.ts // validates dashboard session JWT
│ └─ roles.guard.ts // RBAC check against AAD permission matrix
├─ decorators/
│ ├─ current-agency.decorator.ts
│ └─ roles.decorator.ts
├─ interceptors/
│ ├─ logging.interceptor.ts // structured request/response logs, correlation id
│ └─ audit.interceptor.ts // writes to audit_logs on mutating routes
├─ filters/
│ └─ http-exception.filter.ts // standard { error: {...} } response shape
├─ pipes/
│ └─ validation.pipe.ts
└─ context/
└─ agency-context.ts // request-scoped agencyId, read by every service
```
## 4. src/modules — Feature Modules

Each module follows the standard NestJS shape (module / controller / service / dto / entity). The two structurally important modules are detection (the engine) and intelligence (the CIL) — shown in full detail below.
```
modules/
├─ auth/ // login, refresh, logout, me
├─ agencies/ // agency CRUD (platform_admin)
├─ users/ // dashboard user invite/manage
├─ api-keys/ // create/list/revoke
├─ campaigns/
├─ submissions/ // POST/GET submissions, orchestrates the pipeline
├─ detection/ // the Detection Engine — see §5
├─ intelligence/ // Campaign Intelligence Layer (CIL) — see §6
├─ x-integration/ // X API client: auth, rate limiting, response mapping
├─ audit/ // audit log writer + query endpoint
└─ health/ // liveness/readiness
```
## 5. modules/detection — The Detection Engine

Mirrors the DES pipeline (collect → validate → analyze → aggregate → generate evidence) and the RLS rule organization (rule id prefix by analyzer).
```
detection/
├─ detection.module.ts
├─ pipeline/
│ ├─ collector.service.ts // Stage 1: calls x-integration, writes x_data_snapshots
│ ├─ validator.service.ts // Stage 2: post exists, is public, not already analyzed
│ └─ pipeline.orchestrator.ts // drives a submission through all stages, called by a BullMQ processor
├─ analyzers/
│ ├─ analyzer.interface.ts // common contract: analyze(snapshot) => Finding[]
│ ├─ post-analyzer/
│ ├─ account-analyzer/
│ ├─ engagement-analyzer/
│ ├─ audience-analyzer/
│ ├─ behavior-analyzer/
│ └─ coordination-analyzer/ // stub — post-MVP per DES/DSR
├─ rules/ // git-versioned rule definitions, NOT database rows (TAS)
│ ├─ rule.interface.ts
│ ├─ rule-engine.service.ts // loads + executes rules for a given analyzer
│ ├─ post/ // P-xxx rules
│ ├─ account/ // A-xxx rules
│ ├─ engagement/ // E-xxx rules
│ ├─ audience/ // U-xxx rules
│ ├─ behavior/ // B-xxx rules
│ └─ historical/ // H-xxx rules
├─ aggregator/
│ └─ risk-aggregator.service.ts // Findings[] → riskScore + riskLevel
└─ evidence/
└─ evidence-generator.service.ts // Findings[] → public Evidence[] (strips internal-only fields)
```
Rule files are plain TypeScript, one rule (or small related group) per file, matching the id scheme in the Rule Library Specification, e.g. rules/engagement/E001-new-account-burst.rule.ts. rule-engine.service.ts discovers and executes them; there is no runtime rule editing in MVP — a rule change is a code change, reviewed like any other.

## 6. modules/intelligence — Campaign Intelligence Layer (CIL)
```
intelligence/
├─ intelligence.module.ts
├─ creator-history.service.ts // prior submissions/Risk Scores for a creator
└─ creator.repository.ts
```
MVP scope is read/write persistence of creator history only (per PRD MVP boundaries). Coordination/network detection across creators is a post-MVP extension of this module.

## 7. src/queue — Async Processing
```
queue/
├─ bull.config.ts
├─ processors/
│ └─ analysis.processor.ts // consumes "analyze-submission" jobs, invokes pipeline.orchestrator
└─ producers/
└─ analysis.producer.ts // enqueued by submissions.service on POST /v1/submissions
```
## 8. src/database
```
database/
├─ entities/ // one file per table in the Database Design Specification
├─ migrations/ // timestamped, one per schema change, run in CI/CD (see CI/CD Strategy)
└─ seeds/ // local/dev seed data only — never run against staging or production
```
## 9. test/
```
test/
├─ unit/ // mirrors src/, one spec per service/rule
├─ rules/ // exhaustive per-rule positive/negative/boundary cases (RLS §9)
├─ integration/ // full pipeline against a seeded test database
└─ e2e/ // supertest against a running app instance
```
See the Testing Strategy document for what belongs in each layer.

## 10. Naming & Module Boundary Rules

- A module never imports another module’s repository/entity directly — only its exported service, keeping the detection engine swappable without touching submissions or the API layer.

- Only detection/evidence and submissions may construct the public-facing response shape; every other module works with internal entities.

- Rule files never import NestJS decorators — they are plain functions/classes so they can be unit-tested in isolation and, per RLS, potentially extracted into a standalone package later.
