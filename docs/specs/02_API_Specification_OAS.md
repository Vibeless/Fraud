# API Specification

*OAS — OpenAPI-Aligned REST Specification*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** SRS v1.0 (FR-001, FR-004, FR-005, FR-008–FR-010), TAS v1.0, Detection Engine Specification v1.0

## 1. Purpose & Conventions

This document specifies the REST API surface for Campaign Integrity API in OpenAPI-compatible terms: resources, methods, request/response schemas, auth, and error handling. It is the source of truth for generating the machine-readable openapi.yaml during Phase 4.

### 1.1 Base URL

https://api.campaignintegrity.io/v1

### 1.2 Conventions

- All request/response bodies are JSON (application/json).

- All timestamps are ISO 8601 UTC (e.g. 2026-08-01T14:32:00Z).

- Identifiers are UUIDv4 unless noted.

- Pagination uses page (1-indexed) and pageSize query params; responses include a pagination object with total, page, pageSize.

- Every internal analyzer score, weight, and threshold described in the Detection Engine Specification is intentionally absent from every response body in this document — only Risk Score, Risk Level, and Evidence are exposed (DES §9).

## 2. Authentication

Two independent auth mechanisms are supported — see the Authentication & Authorization Design document for full detail.

- Agency API access: API key in the Authorization header — Authorization: Bearer \<api_key\>. Used for all /submissions, /analyses, and /campaigns endpoints.

- Dashboard (internal user) access: short-lived JWT access token, obtained via /auth/login, sent as Authorization: Bearer \<jwt\>, refreshed via /auth/refresh.

## 3. Standard Error Format
```
{
"error": {
"code": "VALIDATION_ERROR",
"message": "postUrl must be a valid X post URL",
"details": {}
}
}
```
Common error codes: VALIDATION_ERROR (400), UNAUTHORIZED (401), FORBIDDEN (403), NOT_FOUND (404), DUPLICATE_SUBMISSION (409), RATE_LIMITED (429), ANALYSIS_FAILED (422), INTERNAL_ERROR (500).

## 4. Rate Limiting

Every response includes rate-limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset (unix timestamp). Limits are scoped per API key, per the Authentication & Authorization Design document.

## 5. Submissions

| **POST** | **/v1/submissions** |
|----------|---------------------|

#### Submit an X post for analysis (FR-001).

Queues the post for the Detection Engine pipeline (collect → validate → analyze). Returns immediately with status=queued; poll GET /v1/submissions/{id} or GET /v1/submissions/{id}/analysis for the result.

**Auth:** API key

#### Request Body
```
{
"postUrl": "https://x.com/creator/status/1234567890",
"campaignId": "3fa85f64-5717-4562-b3fc-2c963f66afa6", // optional
"externalSubmissionId": "camp-42-sub-7" // optional, for idempotency
}
```
#### Response
```
201 Created
{
"id": "b6b1...c2",
"status": "queued",
"postUrl": "https://x.com/creator/status/1234567890",
"campaignId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
"createdAt": "2026-08-01T14:32:00Z"
}
```
#### Error Responses

| **Status** | **Code**             | **Meaning**                                          |
|------------|----------------------|------------------------------------------------------|
| 400        | VALIDATION_ERROR     | postUrl missing, malformed, or not a supported X URL |
| 409        | DUPLICATE_SUBMISSION | externalSubmissionId already used by this agency     |
| 429        | RATE_LIMITED         | Submission rate limit exceeded                       |

| **GET** | **/v1/submissions/{id}** |
|---------|--------------------------|

#### Get a submission’s current status.

**Auth:** API key

#### Response
```
200 OK
{
"id": "b6b1...c2",
"status": "completed", // pending | validating | queued | analyzing | completed | failed
"postUrl": "https://x.com/creator/status/1234567890",
"campaignId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
"latestAnalysisId": "a91f...0e",
"createdAt": "2026-08-01T14:32:00Z",
"updatedAt": "2026-08-01T14:32:41Z"
}
```
#### Error Responses

| **Status** | **Code**  | **Meaning**                                |
|------------|-----------|--------------------------------------------|
| 404        | NOT_FOUND | No submission with that id for this agency |

| **GET** | **/v1/submissions/{id}/analysis** |
|---------|-----------------------------------|

#### Get the latest completed analysis for a submission (FR-005).

This is the primary result endpoint. It returns exactly the fields an agency needs to make a decision — no internal analyzer scores or weights.

**Auth:** API key

#### Response
```
200 OK
{
"analysisId": "a91f...0e",
"submissionId": "b6b1...c2",
"riskScore": 72,
"riskLevel": "high", // low | moderate | high | critical
"riskSummary": "High risk — signs of artificial engagement velocity and patterns.",
"evidence": [
{
"category": "engagement",
"severity": "high",
"summary": "38% of likes came from accounts created in the last 30 days."
},
{
"category": "timing",
"severity": "medium",
"summary": "Engagement volume spiked within 90 seconds of posting, faster than 98% of organic posts."
}
],
"analysisVersion": "engine-1.4.0+rules-2026.07",
"analyzedAt": "2026-08-01T14:32:41Z",
"creatorContext": {
"accountAgeSummary": "Account created 3 years ago",
"followerCount": 12500,
"priorSubmissionsCount": 2,
"priorSubmissionsAvgRiskScore": 42
}
}
```
#### Error Responses

| **Status** | **Code**        | **Meaning**                                             |
|------------|-----------------|---------------------------------------------------------|
| 404        | NOT_FOUND       | No submission, or no completed analysis yet             |
| 422        | ANALYSIS_FAILED | Analysis attempted but could not complete — see message |

| **GET** | **/v1/analyses/{id}** |
|---------|-----------------------|

#### Get a specific analysis by id.

Used to retrieve a historical analysis after re-analysis has produced a newer one — supports the reproducibility model in RLS §8.

**Auth:** API key

#### Response

200 OK — same schema as GET /v1/submissions/{id}/analysis

| **PATCH** | **/v1/submissions/{id}/review** |
|-----------|---------------------------------|

#### Persist reviewer notes and mark a submission reviewed (DUXS §4.3).

**Auth:** Dashboard JWT only (agency_admin, fraud_reviewer)

#### Request Body
```
{
"reviewerNote": "Spike in new accounts looks inorganic. Flagged for agency lead.",
"markReviewed": true
}
```

#### Response
```
200 OK
{
"id": "b6b1...c2",
"status": "completed",
"reviewerNote": "Spike in new accounts looks inorganic. Flagged for agency lead.",
"reviewedBy": "u123...45",
"reviewedAt": "2026-08-17T12:00:00Z",
"updatedAt": "2026-08-17T12:00:00Z"
}
```

#### Error Responses

| **Status** | **Code**         | **Meaning**                                             |
|------------|------------------|---------------------------------------------------------|
| 400        | VALIDATION_ERROR | Request body validation failed                          |
| 401        | UNAUTHORIZED     | Missing or invalid dashboard session token              |
| 403        | FORBIDDEN        | Caller does not have fraud_reviewer or agency_admin role|
| 404        | NOT_FOUND        | Submission not found for caller's agency                |

## 6. Listing & Filtering (Dashboard + API)

| **GET** | **/v1/submissions** |
|---------|---------------------|

#### List submissions for the caller’s agency, with filters (FR-009).

**Auth:** API key or dashboard JWT

#### Response
```
Query params: status, riskLevel, campaignId, dateFrom, dateTo, page, pageSize
```
```
200 OK
{
"data": [ { "id": "...", "status": "completed", "riskLevel": "high", ... } ],
"pagination": { "total": 214, "page": 1, "pageSize": 25 }
}
```
## 7. Campaigns

| **POST** | **/v1/campaigns** |
|----------|-------------------|

#### Create a campaign reference used to group submissions (starts in status: "draft").

**Auth:** API key (`campaigns:write`) or dashboard JWT (`platform_admin`, `agency_admin`, `campaign_manager`)

#### Request Body
```json
{
  "name": "Q3 Ambassador Drop",
  "externalCampaignId": "camp-42"
}
```
#### Response
```json
201 Created
{
  "id": "c3705b37-562e-44b4-865f-fe5d233b626c",
  "name": "Q3 Ambassador Drop",
  "externalCampaignId": "camp-42",
  "status": "draft",
  "submissionCount": 0,
  "averageRiskScore": null,
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T10:00:00Z"
}
```

| **GET** | **/v1/campaigns** |
|---------|-------------------|

#### List campaigns for the caller’s agency, with aggregate metrics (DUXS §4.4).

**Auth:** API key (`campaigns:read`) or dashboard JWT

#### Query Parameters
- `status` (optional): `draft` | `active` | `closed`
- `agencyId` (required for `platform_admin` cross-agency queries)
- `page` (default: 1)
- `pageSize` (default: 25)

#### Response
```json
200 OK
{
  "data": [
    {
      "id": "c3705b37-562e-44b4-865f-fe5d233b626c",
      "name": "Q3 Ambassador Drop",
      "externalCampaignId": "camp-42",
      "status": "active",
      "submissionCount": 42,
      "averageRiskScore": 60,
      "createdAt": "2026-08-01T10:00:00Z",
      "updatedAt": "2026-08-01T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```

| **GET** | **/v1/campaigns/{id}** |
|---------|------------------------|

#### Get a single campaign by ID with aggregate metrics.

**Auth:** API key (`campaigns:read`) or dashboard JWT

#### Response
```json
200 OK
{
  "id": "c3705b37-562e-44b4-865f-fe5d233b626c",
  "name": "Q3 Ambassador Drop",
  "externalCampaignId": "camp-42",
  "status": "active",
  "submissionCount": 42,
  "averageRiskScore": 60,
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T10:00:00Z"
}
```

| **PATCH** | **/v1/campaigns/{id}/activate** |
|-----------|---------------------------------|

#### Activate a draft campaign (draft -> active).

**Auth:** API key (`campaigns:write`) or dashboard JWT (`platform_admin`, `agency_admin`, `campaign_manager`)

#### Response
```json
200 OK
{
  "id": "c3705b37-562e-44b4-865f-fe5d233b626c",
  "name": "Q3 Ambassador Drop",
  "externalCampaignId": "camp-42",
  "status": "active",
  "submissionCount": 0,
  "averageRiskScore": null,
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T10:15:00Z"
}
```

| **PATCH** | **/v1/campaigns/{id}/close** |
|-----------|------------------------------|

#### Close an active campaign (active -> closed), locking submissions and queueing final analysis.

**Auth:** API key (`campaigns:write`) or dashboard JWT (`platform_admin`, `agency_admin`, `campaign_manager`)

#### Response
```json
200 OK
{
  "id": "c3705b37-562e-44b4-865f-fe5d233b626c",
  "name": "Q3 Ambassador Drop",
  "externalCampaignId": "camp-42",
  "status": "closed",
  "submissionCount": 42,
  "averageRiskScore": 60,
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T12:00:00Z"
}
```

| **PATCH** | **/v1/campaigns/{id}/reopen** |
|-----------|-------------------------------|

#### Reopen a closed campaign (closed -> active), marking previous analyses stale and allowing submissions.

**Auth:** API key (`campaigns:write`) or dashboard JWT (`platform_admin`, `agency_admin`, `campaign_manager`)

#### Response
```json
200 OK
{
  "id": "c3705b37-562e-44b4-865f-fe5d233b626c",
  "name": "Q3 Ambassador Drop",
  "externalCampaignId": "camp-42",
  "status": "active",
  "submissionCount": 42,
  "averageRiskScore": 60,
  "createdAt": "2026-08-01T10:00:00Z",
  "updatedAt": "2026-08-01T13:00:00Z"
}
```

| **POST** | **/v1/campaigns/{id}/analyze** |
|----------|--------------------------------|

#### Manually trigger an asynchronous campaign analysis on an active campaign.

**Auth:** API key (`campaigns:write`) or dashboard JWT (`platform_admin`, `agency_admin`, `campaign_manager`)

#### Response
```json
201 Created
{
  "campaignId": "c3705b37-562e-44b4-865f-fe5d233b626c",
  "analysisId": "e5f2780e-3b2d-45f8-8a89-299f0e1590df",
  "version": 1,
  "status": "pending",
  "trigger": "manual",
  "createdAt": "2026-08-01T10:30:00Z"
}
```


## 8. Authentication (Dashboard)

| **POST** | **/v1/auth/login** |
|----------|--------------------|

#### Exchange email + password for a session.

**Auth:** None

#### Request Body
```
{
"email": "reviewer@agency.com",
"password": "••••••••"
}
```
#### Response
```
200 OK
{
"accessToken": "eyJ...",
"refreshToken": "eyJ...",
"expiresIn": 900,
"user": { "id": "...", "email": "...", "role": "fraud_reviewer" }
}
```
#### Error Responses

| **Status** | **Code**     | **Meaning**         |
|------------|--------------|---------------------|
| 401        | UNAUTHORIZED | Invalid credentials |

| **POST** | **/v1/auth/refresh** |
|----------|----------------------|

#### Exchange a valid refresh token for a new access token.

**Auth:** Refresh token

#### Response
```
200 OK
{ "accessToken": "eyJ...", "expiresIn": 900 }
```
| **POST** | **/v1/auth/logout** |
|----------|---------------------|

#### Revoke the current refresh token.

**Auth:** Dashboard JWT

#### Response

204 No Content

| **GET** | **/v1/auth/me** |
|---------|-----------------|

#### Get the current user’s profile and role.

**Auth:** Dashboard JWT

#### Response
```
200 OK
{ "id": "...", "email": "...", "role": "fraud_reviewer", "agencyId": "..." }
```
## 9. API Key Management

| **GET** | **/v1/api-keys** |
|---------|------------------|

#### List API keys for the agency (secret never returned after creation).

**Auth:** Dashboard JWT (agency_admin)

#### Response
```
200 OK
{ "data": [ { "id": "...", "keyPrefix": "ci_live_8f2a", "name": "Prod backend", "createdAt": "...", "lastUsedAt": "...", "revokedAt": null } ] }
```
| **POST** | **/v1/api-keys** |
|----------|------------------|

#### Create a new API key. The full secret is returned once.

**Auth:** Dashboard JWT (agency_admin)

#### Request Body

{ "name": "Prod backend", "scopes": \["submissions:write", "analyses:read"\] }

#### Response
```
201 Created
{ "id": "...", "key": "ci_live_8f2a...FULL_SECRET...", "keyPrefix": "ci_live_8f2a" }
```
| **DELETE** | **/v1/api-keys/{id}** |
|------------|-----------------------|

#### Revoke an API key immediately.

**Auth:** Dashboard JWT (agency_admin)

#### Response

204 No Content

## 10. Users & Roles Management

| **POST** | **/v1/users** |
|----------|---------------|

#### Invite a new user to the agency.

Generates a cryptographically secure random temporary password, hashes it with Argon2id, creates the user in `invited` status, and returns the temporary password once in the response.

**Auth:** Dashboard JWT (agency_admin, platform_admin)

#### Request Body
```json
{
  "email": "analyst@agency.com",
  "role": "fraud_reviewer",
  "agencyId": "3fa85f64-5717-4562-b3fc-2c963f66afa6" // required for platform_admin only
}
```

#### Response
```json
201 Created
{
  "id": "b6b10000-0000-0000-0000-000000000001",
  "email": "analyst@agency.com",
  "role": "fraud_reviewer",
  "status": "invited",
  "temporaryPassword": "aBcDeFgHiJkLmNoP",
  "createdAt": "2026-08-18T10:00:00.000Z"
}
```

#### Error Responses

| **Status** | **Code** | **Meaning** |
|------------|----------|-------------|
| 400 | VALIDATION_ERROR | Invalid email, missing required fields, or attempting to invite `platform_admin` |
| 403 | FORBIDDEN | Non-platform_admin attempting to invite for a different agency |
| 409 | CONFLICT | User with this email already exists |

| **GET** | **/v1/users** |
|---------|---------------|

#### List users for the agency.

**Auth:** Dashboard JWT (agency_admin, platform_admin)

#### Response
```json
200 OK
{
  "data": [
    {
      "id": "b6b10000-0000-0000-0000-000000000001",
      "email": "analyst@agency.com",
      "role": "fraud_reviewer",
      "status": "active",
      "lastLoginAt": "2026-08-18T10:30:00.000Z",
      "createdAt": "2026-08-18T10:00:00.000Z"
    }
  ]
}
```

| **PATCH** | **/v1/users/{id}/role** |
|-----------|-------------------------|

#### Update a user's RBAC role.

**Auth:** Dashboard JWT (agency_admin, platform_admin)

#### Request Body
```json
{
  "role": "campaign_manager"
}
```

#### Response
```json
200 OK
{
  "id": "b6b10000-0000-0000-0000-000000000001",
  "email": "analyst@agency.com",
  "role": "campaign_manager",
  "status": "active",
  "lastLoginAt": "2026-08-18T10:30:00.000Z",
  "createdAt": "2026-08-18T10:00:00.000Z",
  "updatedAt": "2026-08-18T11:00:00.000Z"
}
```

#### Error Responses

| **Status** | **Code** | **Meaning** |
|------------|----------|-------------|
| 400 | VALIDATION_ERROR | Invalid role or attempting to assign `platform_admin` |
| 404 | NOT_FOUND | User not found or belongs to another agency |

| **PATCH** | **/v1/users/{id}/disable** |
|-----------|----------------------------|

#### Disable a user account.

Sets the user's status to `disabled`. The caller cannot disable their own account.

**Auth:** Dashboard JWT (agency_admin, platform_admin)

#### Response
```json
200 OK
{
  "id": "b6b10000-0000-0000-0000-000000000001",
  "email": "analyst@agency.com",
  "role": "fraud_reviewer",
  "status": "disabled",
  "lastLoginAt": "2026-08-18T10:30:00.000Z",
  "createdAt": "2026-08-18T10:00:00.000Z",
  "updatedAt": "2026-08-18T11:15:00.000Z"
}
```

#### Error Responses

| **Status** | **Code** | **Meaning** |
|------------|----------|-------------|
| 400 | VALIDATION_ERROR | Admin attempting to disable their own account |
| 404 | NOT_FOUND | User not found or belongs to another agency |

## 11. Audit Log

| **GET** | **/v1/audit-logs** |
|---------|--------------------|

#### Query audit events for the agency (FR-010).

**Auth:** Dashboard JWT (agency_admin, fraud_reviewer)

#### Response
```
Query params: action, actorId, dateFrom, dateTo, page, pageSize, agencyId (required for platform_admin)
```
```
200 OK
{
  "data": [
    {
      "id": "a0000000-0000-0000-0000-000000000001",
      "action": "api_key.created",
      "actorType": "user",
      "actorId": "5085e567-47f3-412f-91b2-78d22dcdd983",
      "actorLabel": "admin@dev-test-agency.local",
      "resourceType": "api_key",
      "resourceId": "c3705b37-1111-2222-3333-444444444444",
      "ipAddress": "192.168.1.100",
      "createdAt": "2026-08-18T02:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "pageSize": 25
  }
}
```
## 12. Health

| **GET** | **/v1/health** |
|---------|----------------|

#### Liveness/readiness probe for load balancers and orchestration.

**Auth:** None

#### Response
```
200 OK
{ "status": "ok", "version": "1.4.0", "dependencies": { "database": "ok", "redis": "ok", "queue": "ok" } }
```
## 13. Out of Scope for MVP

- Webhooks / push notifications on analysis completion — MVP is poll-based; agencies call GET /v1/submissions/{id}/analysis until status=completed.

- Bulk submission endpoint (submit many posts in one call).

- PATCH/PUT on submissions or analyses — all data is immutable once created; re-analysis creates a new analysis rather than mutating one.

- Public, unauthenticated endpoints beyond /v1/health.

- Self-service password change or reset endpoints (e.g. POST /v1/auth/change-password, POST /v1/auth/reset-password) — MVP users authenticate with their initial provisioned/temporary credentials; password rotation and email-based reset tokens are planned post-MVP extensions.
