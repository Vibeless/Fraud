# CI/CD Strategy

*CICD — Continuous Integration & Delivery Strategy*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** TAS v1.0, Backend Folder Structure v1.0, Rule Library Specification v1.0, Testing Strategy v1.0

## 1. Purpose

Defines how code moves from a pull request to production for both the backend (NestJS) and frontend (Next.js), and — because rules are code, per the Rule Library Specification — how a rule change goes through the same review and test gates as any other change.

## 2. Branching Strategy

- Trunk-based, lightweight: main is always deployable to staging.

- Feature branches (feature/\*, fix/\*, rule/\*) off main, merged via pull request — no direct pushes to main.

- rule/\* branches are used specifically for new/changed detection rules, so rule PRs are easy to identify and route to a reviewer familiar with the Detection Engine.

- Releases to production are tagged (v1.4.0) from main; production always runs a tagged release, never an untagged commit.

## 3. Environments

| **Environment** | **Purpose**                               | **Deploys From**                           |
|-----------------|-------------------------------------------|--------------------------------------------|
| dev             | Local + ephemeral PR preview environments | Every PR branch                            |
| staging         | Pre-production, used for pilot agency UAT | Every merge to main                        |
| production      | Live traffic                              | Tagged releases only, manual approval gate |

## 4. Pipeline Stages (per PR)
```
PR opened/updated
│
├─ 1. Install & cache dependencies
├─ 2. Lint (ESLint + Prettier check) — backend & frontend
├─ 3. Type check (tsc --noEmit) — backend & frontend
├─ 4. Unit tests — includes full rule test suite (RLS §9)
├─ 5. Integration tests — pipeline tests against a Postgres + Redis service container
├─ 6. Build (nest build / next build)
├─ 7. Ephemeral preview deploy (dev environment) — optional, for frontend PRs
└─ 8. Required status checks must pass before merge is allowed
```
## 5. Pipeline Stages (on merge to main → staging)
```
Merge to main
├─ 1. Full test suite (unit + integration + e2e against staging-like services)
├─ 2. Build & tag Docker images (backend, frontend) with the commit SHA
├─ 3. Push images to the container registry
├─ 4. Run database migrations against staging (see §6 — explicit, gated step)
├─ 5. Deploy backend + frontend to staging
└─ 6. Smoke test: POST a known-good submission through staging, assert a completed analysis
```
## 6. Database Migration Gate

Migrations never run automatically against production. The pipeline treats them as an explicit, reviewable step:

- Every schema change ships as a migration file reviewed in the same PR as the code that needs it (see Database Design Specification).

- On merge to main, migrations run automatically only against staging.

- On a production release, migrations run as a separate, logged pipeline job that must succeed before the new backend image is deployed — if it fails, the release halts and the previous image keeps serving traffic.

- All migrations are additive/backward-compatible where possible (expand-then-contract) so the previous backend version keeps working during a rolling deploy.

## 7. Rule Changes — Additional Gate

Because rules directly affect Risk Scores shown to agencies, a rule/\* PR requires, in addition to the standard checks:

- The full per-rule test matrix from the Rule Library Specification §9 (positive, negative, and boundary cases) passing with no exceptions.

- A second reviewer approval from someone with Detection Engine context (CODEOWNERS entry on detection/rules/\*\*).

- A recorded rule_version bump, so any Risk Score produced after the change is traceable to the exact rule set that produced it (Database Design Specification §7).

> **Single-Contributor Project Note (as of August 2026):**
> The "second reviewer approval from someone with Detection Engine context" requirement is currently unenforceable via GitHub branch protection for a single-contributor project. The Rule Library Specification (RLS) §9 test matrix (positive, negative, and boundary cases, passing with no exceptions) serves as the primary automated safety net for all detection rule changes until/unless a second reviewer is available. This test requirement remains strictly mandatory and must never be bypassed or weakened.

## 8. Production Release
```
Tag vX.Y.Z on main
├─ 1. Re-run full test suite against the tagged commit
├─ 2. Build & push production images tagged vX.Y.Z
├─ 3. Manual approval gate (release owner)
├─ 4. Run production migrations (gated, logged, see §6)
├─ 5. Rolling deploy: new backend instances brought up behind the load
│ balancer, health-checked, old instances drained — zero-downtime
├─ 6. Post-deploy smoke test against production
└─ 7. Automatic rollback to the previous image if health checks or
smoke tests fail
```
## 9. Secrets Management

- CI secrets (registry credentials, deploy keys) live in the CI provider’s encrypted secret store, never in the repository.

- Runtime secrets (DB credentials, JWT signing key, X API credentials) live in the environment’s secrets manager and are injected at deploy time — see Deployment Architecture §5.

## 10. Tooling (indicative)

| **Concern**        | **Tool**                                      |
|--------------------|-----------------------------------------------|
| CI orchestration   | GitHub Actions                                |
| Container registry | GitHub Container Registry / equivalent        |
| Static analysis    | ESLint, Prettier, tsc                         |
| Test runners       | Jest (unit/integration), Playwright (e2e)     |
| Migrations         | TypeORM/Prisma migration CLI, run as a CI job |
