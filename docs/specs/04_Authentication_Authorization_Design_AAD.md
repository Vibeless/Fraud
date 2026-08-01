# Authentication & Authorization Design

*AAD — Authentication & Authorization Design*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** SRS v1.0 (Security requirements, FR-008, FR-010), TAS v1.0 (Auth Module)

## 1. Purpose

This document specifies how Campaign Integrity API authenticates and authorizes its two distinct classes of caller — agencies calling the REST API programmatically, and human users of the dashboard — and defines the role-based access control (RBAC) model used across both.

## 2. Two Authentication Mechanisms

|            | **API Key**                             | **Dashboard Session (JWT)**                           |
|------------|-----------------------------------------|-------------------------------------------------------|
| Used by    | Agency backends calling the REST API    | Human users in the browser dashboard                  |
| Credential | Long-lived secret, agency-scoped        | Short-lived access token + refresh token, user-scoped |
| Issued via | POST /v1/api-keys (agency_admin only)   | POST /v1/auth/login                                   |
| Sent as    | Authorization: Bearer \<api_key\>       | Authorization: Bearer \<jwt\> (or httpOnly cookie)    |
| Revocation | Immediate, via DELETE /v1/api-keys/{id} | Refresh token revocation on logout / password change  |

## 3. API Key Design

### 3.1 Format & Storage

- Keys are generated as ci_live\_\<32 random bytes, base62\> (ci_test\_ prefix for a future sandbox environment).

- Only a salted hash (Argon2id) of the key is stored, in api_keys.key_hash — identical to password storage practice. The full secret is shown exactly once, at creation time, and is not retrievable afterward.

- key_prefix (first 12 characters) is stored in plaintext for display in the dashboard (e.g. "ci_live_8f2a…") so an admin can identify a key without ever seeing the secret again.

### 3.2 Scopes

Each API key carries a scopes array, checked by a NestJS guard on every route. MVP scopes:

| **Scope**         | **Grants**                                               |
|-------------------|----------------------------------------------------------|
| submissions:write | POST /v1/submissions                                     |
| submissions:read  | GET /v1/submissions, GET /v1/submissions/{id}            |
| analyses:read     | GET /v1/submissions/{id}/analysis, GET /v1/analyses/{id} |
| campaigns:write   | POST /v1/campaigns                                       |
| campaigns:read    | GET /v1/campaigns                                        |

### 3.3 Rate Limiting

Rate limits are enforced per key (not per agency) using a Redis-backed sliding-window counter (TAS — Redis is already in the architecture for caching and queueing). Default MVP limit: 120 requests/minute per key for read endpoints, 30 requests/minute for POST /v1/submissions. Limits are configurable per agency for enterprise pilots.

### 3.4 Key Lifecycle
```
created → active → revoked (terminal)
```
```
A revoked key is rejected at the auth guard immediately (checked on every
request, not cached) so revocation takes effect within one request.
```
## 4. Dashboard Session Design (JWT)

### 4.1 Token Flow
```
1. POST /v1/auth/login (email + password)
│ password checked against Argon2id hash
▼
accessToken (JWT, 15 min TTL, holds userId, agencyId, role)
refreshToken (opaque, 30 day TTL, stored hashed server-side, rotated on use)
```
```
2. Client sends accessToken on every request:
Authorization: Bearer <accessToken>
```
```
3. On 401 due to expiry, client calls POST /v1/auth/refresh with the
refreshToken to obtain a new accessToken (refresh token rotation:
the old refresh token is invalidated and a new one issued).
```
  
4. POST /v1/auth/logout revokes the current refresh token immediately.

### 4.2 Password Policy

- Minimum 12 characters; checked against a breached-password list at signup/reset.

- Hashed with Argon2id (memory-hard, resistant to GPU cracking).

- Password reset via time-limited, single-use signed token emailed to the account address.

## 5. Role-Based Access Control (RBAC)

### 5.1 Roles

| **Role**         | **Scope**     | **Description**                                                                              |
|------------------|---------------|----------------------------------------------------------------------------------------------|
| platform_admin   | Cross-agency  | Internal Campaign Integrity staff; operational visibility across all agencies                |
| agency_admin     | Single agency | Manages users, API keys, and billing for their agency; full read/write on that agency’s data |
| campaign_manager | Single agency | Creates campaigns, submits posts, views submissions and Risk Scores                          |
| fraud_reviewer   | Single agency | Views submissions, evidence, and audit log; adds reviewer notes; cannot manage users or keys |
| viewer           | Single agency | Read-only access to submissions and Risk Scores                                              |

### 5.2 Permission Matrix

| **Action**                     | **platform_admin** | **agency_admin** | **campaign_manager** | **fraud_reviewer** | **viewer** |
|--------------------------------|--------------------|------------------|----------------------|--------------------|------------|
| Submit a post                  | Yes                | Yes              | Yes                  | No                 | No         |
| View submissions & Risk Scores | Yes                | Yes              | Yes                  | Yes                | Yes        |
| Add reviewer note              | Yes                | Yes              | No                   | Yes                | No         |
| Manage campaigns               | Yes                | Yes              | Yes                  | No                 | No         |
| Create/revoke API keys         | Yes                | Yes              | No                   | No                 | No         |
| Invite/manage users            | Yes                | Yes              | No                   | No                 | No         |
| View audit log                 | Yes                | Yes              | No                   | Yes                | No         |

Enforcement happens in two layers, per the NestJS structure in the Backend Folder Structure document: a route-level Guard checks "is this role allowed to call this endpoint at all," and a resource-level check in the service layer confirms "does this token’s agencyId match the resource’s agency_id" — preventing cross-agency data access even if a role check alone would pass.

## 6. Multi-Tenancy Isolation

- Every JWT and API key resolves to exactly one agencyId (platform_admin excepted). Every query in the service layer is scoped by that agencyId — there is no endpoint that returns data across agencies to a non-platform_admin caller.

- This is enforced centrally via a request-scoped AgencyContext provider in NestJS, set once by the auth guard and read by every service, so no individual query can accidentally omit the agency filter.

## 7. Security Requirements (from SRS)

- All traffic over TLS 1.2+; HTTP requests are redirected, never served.

- Secrets (API key hashes, password hashes, JWT signing key) are never logged, including in error stack traces.

- JWT signing key and API-key hashing pepper are stored in a secrets manager, not in source control or plain environment files (see Deployment Architecture).

- Every authentication event (login success/failure, key creation/revocation, password reset) is written to audit_logs (FR-010).

- Brute-force protection: login endpoint is rate-limited per IP and per account; repeated failures trigger a temporary lockout with exponential backoff.

## 8. Out of Scope for MVP

- Single sign-on (SSO/SAML) for enterprise agencies.

- Multi-factor authentication (planned as a fast-follow, not MVP-blocking).

- OAuth-based delegated access for third-party integrations.
