---
activation: always_on
description: Non-negotiable security rules for authentication, authorization, secrets, data exposure, and input handling. Highest priority rule file in this repo — apply even when it conflicts with a faster implementation path.
---

# Security Rules

Full detail: `docs/specs/04_Authentication_Authorization_Design_AAD.md`.
These rules exist because this product's entire value proposition is
"an agency can trust this Risk Score." A security or data-isolation bug
here is not a bug like any other — it's the product failing at its one
job. When a task pressures you to cut a corner here for speed, don't.

## Secrets — zero tolerance

- Never write an API key, password, JWT signing key, database
  credential, or third-party token as a literal string in source code,
  a test fixture, a comment, a commit message, or a log statement —
  including "temporary," "for local testing," or "TODO: remove."
- All secrets are read from environment variables, sourced from
  `.env` (which must be in `.gitignore` — verify it's there before
  adding a new secret) locally, and from the secrets manager in
  staging/production per `08_Deployment_Architecture.md` §7.
- If you need a secret that doesn't exist yet, add it to `.env.example`
  with a placeholder value and stop — do not invent a real-looking
  fake credential.
- Password hashes, API key hashes, and the JWT signing key are never
  logged, including inside error stack traces. If you're adding a log
  or error interceptor, confirm it redacts these fields.

## Authentication — two mechanisms, don't blur them

- Agency-to-API calls authenticate with an API key
  (`Authorization: Bearer <api_key>`), validated by `api-key.guard.ts`.
  Only a salted Argon2id hash is ever stored (`api_keys.key_hash`).
  The raw secret is shown exactly once, at creation.
- Dashboard users authenticate with a short-lived JWT (15 min) +
  rotating refresh token (30 day), validated by `jwt.guard.ts`.
  Passwords are Argon2id-hashed, minimum 12 characters.
- Never accept an API key on a dashboard-only route or a JWT on an
  agency-API route without checking `02_API_Specification_OAS.md` §2
  first — they are not interchangeable.
- A revoked API key must be rejected on the *next* request, not on a
  cache-refresh cycle — check `revoked_at` on every request, don't
  cache the "is this key valid" result.

## Authorization — enforce in two layers, every time

1. **Route-level (Guard):** is this role allowed to call this endpoint
   at all? Check the permission matrix in
   `04_Authentication_Authorization_Design_AAD.md` §5.2 — do not invent
   a new role or grant without updating that table first.
2. **Resource-level (service layer):** does this token's `agencyId`
   match the resource's `agency_id`? This check happens even if the
   route-level check already passed — a `campaign_manager` at Agency A
   must never be able to fetch Agency B's submission by guessing its
   UUID.

Every new service method that reads or writes agency-owned data must
include an `agencyId` filter or comparison. If you write a repository
query without one, that's a bug — not a style preference.

## The internal/external data boundary — this is the product's core promise

- `analyses.raw_signal_snapshot`, `findings.details`, and any
  individual analyzer score/weight/threshold are **never** included in
  any HTTP response body, ever — not even for `platform_admin`, not
  even in an error message, not even in a debug-only endpoint. Only
  `evidence-generator.service.ts` produces the public shape, and it is
  the only place allowed to read these fields for that purpose.
- Before returning any object from a controller, ask: does this
  include `raw_signal_snapshot`, `details`, or a bare rule weight? If
  you're not sure, check `02_API_Specification_OAS.md` for the exact
  documented response shape and match it field-for-field.
- The API contract tests (`10_Testing_Strategy.md` §4.2) exist
  specifically to catch this leaking. Do not remove or weaken a
  snapshot test that asserts on response shape without a documented
  reason.

## Input validation & injection

- Every controller input is validated via a DTO + the shared
  `validation.pipe.ts` — no manually-parsed `req.body` access.
- All database access goes through the ORM/query builder's
  parameterized queries. Never string-concatenate user input into SQL,
  including for "just this one admin script."
- Validate `postUrl` actually resolves to a supported X post URL shape
  before it reaches the collector — see `02_API_Specification_OAS.md`
  §5, `VALIDATION_ERROR`.

## Rate limiting & abuse

- Respect the per-API-key limits in
  `04_Authentication_Authorization_Design_AAD.md` §3.3 (120/min read,
  30/min submission) — implement via the Redis sliding-window pattern
  already described there, don't invent a second mechanism.
- Login is rate-limited per-IP and per-account with exponential
  backoff. Don't remove this to "simplify" a login flow change.

## Audit logging

- Every mutating auth/security event (login success/failure, API key
  created/revoked, password reset, role change) writes to `audit_logs`
  — this is not optional and not "add later." See DDS `audit_logs`
  entity and AAD §7.
- `audit_logs` rows are never updated or deleted by application code.

## TLS & transport

- All traffic assumed to be TLS 1.2+; never write code that would
  serve plaintext HTTP in a non-local environment or that disables
  certificate verification "to get past an error."
