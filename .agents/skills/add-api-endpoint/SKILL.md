---
name: add-api-endpoint
description: Use when adding or modifying a REST endpoint on the backend. Ensures auth, scoping, response-shape, and error-handling conventions match the API Specification and security rules.
---

# Adding an API Endpoint

Read first: `docs/specs/02_API_Specification_OAS.md`,
`docs/specs/04_Authentication_Authorization_Design_AAD.md`,
`.agents/rules/20-security.md`, `.agents/rules/30-engineering-standards.md`.

## 1. Check whether this endpoint is already specified

If it's in `02_API_Specification_OAS.md`, match it exactly — method,
path, request/response field names, status codes, error codes. Don't
"improve" the shape while implementing it.

If it's genuinely new, add it to the OAS markdown in the same PR
*before* or alongside the implementation, so the spec stays the source
of truth. Follow the existing endpoint documentation format (Method +
Path banner, Auth, Request Body, Response, Error Responses table).

## 2. Pick the correct auth guard

- Agency-facing endpoint (`/v1/submissions`, `/v1/analyses`,
  `/v1/campaigns`) → `api-key.guard.ts`, and declare the required scope
  (see AAD §3.2 scopes table) via the scope decorator.
- Dashboard-facing endpoint (`/v1/auth/*`, `/v1/api-keys`,
  `/v1/audit-logs`, settings) → `jwt.guard.ts` + `roles.guard.ts` with
  the correct role(s) from AAD §5.2's permission matrix.
- Some endpoints (e.g. `GET /v1/submissions`, `GET /v1/campaigns`)
  accept either — check the OAS "Auth:" line for the specific endpoint
  rather than assuming.

## 3. Add the resource-level agency check

Route-level guard is not enough. In the service method, filter or
compare against the caller's `agencyId` (from `AgencyContext`) before
returning any resource. Write this even if it feels redundant with the
guard — it's the second of the two required layers per
`.agents/rules/20-security.md`.

## 4. Validate input via DTO

Define a DTO class with `class-validator` decorators for the request
body/query; let `validation.pipe.ts` reject malformed input before it
reaches the service. Don't hand-parse `req.body` or `req.query`.

## 5. Shape the response — check for leaking internal fields

Before returning anything, compare field-by-field against the OAS
response example. Specifically confirm the response does **not**
include: `raw_signal_snapshot`, `findings.details`, `is_internal_only`,
or any bare analyzer weight/threshold. If the endpoint returns
analysis data, route the shaping through
`evidence-generator.service.ts` rather than serializing the entity
directly.

## 6. Errors use the standard envelope

Throw NestJS exceptions that resolve to
`{ "error": { "code", "message", "details" } }` via the existing
`http-exception.filter.ts` — use the documented `code` values
(`VALIDATION_ERROR`, `NOT_FOUND`, `DUPLICATE_SUBMISSION`,
`RATE_LIMITED`, `ANALYSIS_FAILED`, etc.) rather than inventing new
ones, unless the OAS is updated to include the new code.

## 7. Write the contract test

Add/update a supertest contract test asserting: request validation
(bad input → 400), auth enforcement (missing/invalid credential →
401), scope/role enforcement (wrong scope or role → 403, including at
least one negative case), resource isolation (cross-agency access →
404, not another agency's data), and a response-shape snapshot that
fails if an internal-only field appears.

## 8. Update rate-limit awareness if this is a write endpoint

Write endpoints (especially `POST /v1/submissions`) are subject to the
tighter rate limit in AAD §3.3. Confirm the existing rate-limit
interceptor applies to the new route rather than bypassing it.
