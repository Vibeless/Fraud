# Testing Strategy

*TS — Testing Strategy*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** SRS v1.0, Rule Library Specification v1.0 (§9), Detection Engine Specification v1.0, Backend/Frontend Folder Structure v1.0, CI/CD Strategy v1.0

## 1. Purpose

Defines the test layers for Campaign Integrity API, with particular emphasis on the Detection Engine — where a testing gap doesn’t just mean a bug, it means an agency receiving a wrong Risk Score. The Rule Library Specification already requires exhaustive per-rule test cases; this document places that requirement in the context of the full test pyramid and ties each layer to the CI/CD gates that enforce it.

## 2. Test Pyramid
```
/\\
/ \\ e2e (fewest, slowest, highest confidence)
/----\\
/ integ \\ integration (pipeline, API contract)
/--------\\
/ unit \\ unit (most, fastest) — rules, analyzers, services, components
/------------\\
```
## 3. Unit Tests

### 3.1 Detection Rules — the highest-stakes unit tests

Per Rule Library Specification §9, every rule ships with an exhaustive, non-negotiable test set before it can merge:

| **Case Type** | **What It Proves**                                                                                                                     |
|---------------|----------------------------------------------------------------------------------------------------------------------------------------|
| Positive      | The rule fires (produces the expected Finding) on data engineered to match its condition                                               |
| Negative      | The rule does not fire on clearly clean data                                                                                           |
| Boundary      | Behavior exactly at the rule’s threshold (e.g. an account exactly 30 days old, if 30 days is the cutoff) is deliberate, not accidental |

- Rule tests run against plain TypeScript inputs (no NestJS DI, no database) so they execute in milliseconds and can run in the thousands without slowing CI, per the Backend Folder Structure decision to keep rule files framework-free.

- A rule PR that adds a rule without all three case types is blocked at the CI/CD rule-change gate (CI/CD Strategy §7).

### 3.2 Analyzers

- Each analyzer is tested against a fixture x_data_snapshot, asserting it invokes the right rule set and assembles Finding\[\] correctly — separate from testing individual rules, which are tested in isolation.

### 3.3 Services & Components

- Backend: standard NestJS unit tests per service (mocked repositories), e.g. risk-aggregator.service.ts, evidence-generator.service.ts, api-keys.service.ts.

- Frontend: component tests for the components in components/risk/ are prioritized — RiskScoreBadge and EvidenceList are the components every reviewer-facing screen depends on.

## 4. Integration Tests

### 4.1 Pipeline Integration

Runs the full DES pipeline — collector → validator → analyzers → aggregator → evidence generator — against a seeded Postgres/Redis test instance, with the X API client mocked to return fixture responses (not live X calls). This is what catches "each piece works alone but the pipeline is wired wrong."

- Fixture library: a curated set of synthetic X post/account/engagement payloads representing known patterns (clean organic post, bot-swarm engagement, coordinated new-account burst, etc.), maintained alongside the rule test fixtures.

- Asserts on the final Risk Score/Risk Level and the presence of expected Evidence entries — an end-to-end check that individual rule unit tests can’t provide alone.

### 4.2 API Contract Tests

- Every endpoint in the API Specification has a contract test asserting request validation, response shape, status codes, and auth/scope enforcement — run against a test database via supertest.

- Response shape assertions double as a guard against accidentally leaking internal-only fields (analyzer scores, weights, findings.details) — a snapshot test on the public analysis response fails loudly if an internal field appears.

### 4.3 X Integration Contract Tests

- The x-integration module is tested against recorded fixture responses matching X’s actual API shapes (per the X API Capability Analysis Tier 1/2 field breakdown), so a change in how X’s response is parsed is caught without depending on live X API availability in CI.

## 5. End-to-End (E2E) Tests

- Backend E2E: submit a post via POST /v1/submissions against a fully running staging-like stack (real queue, real worker, mocked X API), poll until completed, assert the final analysis — the closest thing to what an agency actually experiences.

- Dashboard E2E (Playwright): login → Submissions Queue → Submission Detail, covering the primary reviewer workflow described in the Dashboard UI/UX Specification, run against staging on every merge to main.

- E2E suites are intentionally small in number and focused on the critical paths — broad coverage belongs at the unit/integration layers.

## 6. Non-Functional Testing

### 6.1 Load & Concurrency

- Simulates concurrent submission bursts (e.g. a campaign closing and many creators submitting at once) against staging, verifying queue depth drains within the target in Logging & Monitoring Strategy §5 rather than growing unbounded.

- Run on demand ahead of a pilot launch or after a significant Detection Engine change, not on every CI run.

### 6.2 Security Testing

- Automated: dependency vulnerability scanning in CI, auth/RBAC test cases covering every role × endpoint combination in the Authentication & Authorization Design permission matrix (including negative cases — a viewer must get 403, not a filtered 200).

- Manual/periodic: penetration test ahead of the first paying-customer pilot, per SRS security requirements.

### 6.3 Detection Quality (Regression, Not Just Correctness)

- A "golden set" of previously-analyzed real submissions (with agency-confirmed outcomes where available) is re-run whenever the rule set changes, and the resulting Risk Score distribution is diffed against the previous rule version — catching an unintended detection regression that unit tests, which check individual rules in isolation, cannot catch on their own.

- This golden-set comparison is advisory in MVP (a report a reviewer reads, per the CI/CD rule-change gate) rather than a hard CI gate, since some score movement on a rule change is expected and desirable.

## 7. Test Data

- All fixture data is synthetic or fully anonymized — no real agency or creator data is used in automated tests, consistent with SRS data-handling requirements.

- Fixtures live alongside the code they test (test/rules/, test/integration/fixtures/) per the Backend Folder Structure, versioned in the same PR as the rule or analyzer they support.

## 8. Ownership & CI Gates

| **Layer**                       | **Runs**         | **Blocking?**                                                                   |
|---------------------------------|------------------|---------------------------------------------------------------------------------|
| Unit (incl. rules)              | Every PR         | Yes — required check                                                            |
| Integration                     | Every PR         | Yes — required check                                                            |
| API contract                    | Every PR         | Yes — required check                                                            |
| E2E                             | Merge to main    | Yes — blocks staging deploy on failure                                          |
| Load/concurrency                | On demand        | No — informational, reviewed before major releases                              |
| Golden-set detection regression | Every rule/\* PR | Advisory — reviewed by the second Detection Engine approver (CI/CD Strategy §7) |

See CI/CD Strategy §4 for exactly where each layer sits in the pipeline.
