---
activation: always_on
description: API contract conventions, database/migration hygiene, testing requirements, and logging conventions. Apply to every code change; treat the referenced spec section as binding.
---

# Engineering Standards

## API conventions

Full detail: `docs/specs/02_API_Specification_OAS.md`.

- Every endpoint response matches the documented shape in the OAS —
  field names, nesting, and types. Don't rename `riskScore` to `score`
  or similar "cleanups" without updating the spec first.
- Errors always use the standard envelope:
  `{ "error": { "code", "message", "details" } }` via
  `http-exception.filter.ts`. Never throw a raw unhandled exception
  that leaks a stack trace to the client.
- Timestamps are ISO 8601 UTC. IDs are UUIDv4 unless the spec says
  otherwise. Pagination uses `page` (1-indexed) + `pageSize`, response
  includes `pagination: { total, page, pageSize }`.
- New endpoints are additive. Don't repurpose an existing route's
  semantics — add a new one and deprecate the old one explicitly if
  needed.
- `PATCH`/`PUT` on `submissions` or `analyses` is out of scope by
  design (§12) — these resources are immutable once created;
  re-analysis creates a new `analyses` row. Don't add a mutation
  endpoint here without flagging that this contradicts the spec.

## Database & migrations

Full detail: `docs/specs/01_Database_Design_and_ERD_Specification_DDS.md`,
`docs/specs/07_CICD_Strategy.md` §6.

- One migration file per schema change, committed in the same PR as
  the code that depends on it.
- Migrations must be additive/backward-compatible (expand-then-contract)
  wherever possible, so a rolling deploy doesn't break the previous
  backend version mid-rollout.
- Never edit a migration file that has already been merged to `main`.
  If it's wrong, write a new migration that corrects it.
- Don't run migrations ad hoc against staging or production — they run
  as an explicit, logged CI/CD pipeline step (CI/CD Strategy §6).
  If you're generating deploy instructions, follow that gate, don't
  shortcut it with a manual `migrate` command against a live
  environment.
- Respect the indexing strategy in DDS §6 when adding query patterns —
  e.g. don't add an unindexed filter on `submissions.agency_id` at
  scale; check whether an existing composite index already covers it.

## Testing — what "done" means

Full detail: `docs/specs/10_Testing_Strategy.md`.

- **Any new or changed detection rule** requires three test cases
  before it's mergeable: positive (fires on matching data), negative
  (doesn't fire on clean data), and boundary (exact threshold
  behavior is deliberate). This is non-negotiable per RLS §9 — do not
  ship a rule with only a positive test "to save time."
- Rule and analyzer unit tests run against plain TypeScript fixtures —
  no NestJS DI, no live database. If a rule test needs to spin up the
  app context, that's a sign the rule file has picked up a framework
  dependency it shouldn't have (see architecture rules).
- New/changed endpoints get an API contract test asserting request
  validation, response shape, status codes, and auth/scope enforcement
  — including the negative case (wrong role → 403, not a filtered 200).
- New/changed endpoints that touch internal-only fields
  (`raw_signal_snapshot`, `findings.details`, analyzer weights) need a
  response-shape assertion that fails if those fields leak — this is
  the automated backstop for the security rule on data exposure.
- Pipeline changes (collector/validator/analyzers/aggregator/evidence)
  get an integration test against seeded Postgres/Redis with the X API
  client mocked — not live X calls in CI.
- Don't write a new E2E test for something already covered at the
  unit/integration layer — E2E is reserved for the critical path
  (submit → poll → completed analysis; login → queue → detail).

## Logging & observability

Full detail: `docs/specs/09_Logging_Monitoring_Strategy.md`.

- All logs are structured JSON, one event per line — never
  `console.log("some string")` in application code.
- Every request gets a `correlationId` generated at the API edge and
  propagated through the BullMQ job it enqueues, so a submission's
  full journey is traceable with one query. If you add a new async
  hop, propagate the existing `correlationId` — don't generate a new
  one.
- Use the right level: `error` for unhandled exceptions/failed
  analyses, `warn` for retries/near-misses, `info` for lifecycle
  events, `debug` for rule-level detail (disabled in production by
  default).
- Never log a secret, password hash, JWT, or full request body that
  might contain credentials — this duplicates the security rule
  deliberately; logging is a common place secrets leak by accident.

## CI/CD awareness

Full detail: `docs/specs/07_CICD_Strategy.md`.

- Branch naming signals intent: `feature/*`, `fix/*`, `rule/*` (for
  detection rule changes — these get an extra reviewer + the full
  RLS §9 test matrix, don't file a rule change as a generic
  `feature/*`).
- Don't propose direct commits to `main` or ad hoc production
  deploys outside the tagged-release flow.
