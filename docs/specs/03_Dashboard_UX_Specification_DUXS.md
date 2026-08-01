# Dashboard UI/UX Specification

*DUXS — Dashboard UI/UX Specification*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** PRD v1.1 (target users, FR-009), SRS v1.0, Detection Engine Specification v1.0, Rule Library Specification v1.0

## 1. Purpose & Design Philosophy

The dashboard is the human-facing surface of Campaign Integrity API, used primarily by campaign managers and fraud review teams. Its job is to make a Risk Score trustworthy and actionable — never a black box. Every screen that shows a score also shows the evidence behind it, and the platform never renders a final "bot / not bot" verdict; that decision stays with the human reviewer (PRD principle).

- Explainability first. Evidence is never more than one click from a score.

- Color-coded risk, consistently applied: Low = green, Moderate = yellow, High = orange, Critical = red — matching the Risk Level thresholds in FR-005.

- Reviewer workflow, not just reporting. Fraud reviewers can triage a queue, not only view a static report.

- No internal scoring mechanics exposed. Analyzer weights, thresholds, and raw signal values (DES §9) never appear in the UI — only the Risk Score, Risk Level, and Evidence sentences.

## 2. Primary User Roles

| **Role**                  | **Primary Goal on the Dashboard**                                              |
|---------------------------|--------------------------------------------------------------------------------|
| Campaign Manager          | Submit posts, see risk at a glance across a campaign, decide who gets rewarded |
| Fraud Reviewer            | Triage flagged submissions, inspect evidence in depth, make the final call     |
| Agency Admin              | Manage users, API keys, and billing/usage for the agency                       |
| Platform Admin (internal) | Cross-agency operational visibility, not covered in detail in this document    |

## 3. Information Architecture
```
Login
└─ Dashboard Shell (left nav + top bar)
├─ Submissions Queue (default landing page)
│ └─ Submission Detail (Risk Score + Evidence)
├─ Campaigns
│ └─ Campaign Detail (submissions filtered to one campaign)
├─ Audit Log (agency_admin, fraud_reviewer)
└─ Settings
├─ API Keys (agency_admin)
└─ Users & Roles (agency_admin)
```
## 4. Screens

### 4.1 Login

Email + password authentication into the agency’s dashboard workspace.

**Accessible to:** Everyone (unauthenticated)

#### Layout

| **Region**  | **Content**                                                           |
|-------------|-----------------------------------------------------------------------|
| Center card | Email field, password field, "Log in" button, "Forgot password?" link |
| Footer      | Link to Campaign Integrity documentation                              |

#### Behavior & Notes

- On failure, show a generic "Invalid email or password" message — never reveal which field was wrong.

- Successful login redirects to Submissions Queue.

### 4.2 Submissions Queue

The default landing page — a sortable, filterable list of all submissions for the agency, built for fast triage.

**Accessible to:** Campaign Manager, Fraud Reviewer, Agency Admin

#### Layout

| **Region**    | **Content**                                                                                                                      |
|---------------|----------------------------------------------------------------------------------------------------------------------------------|
| Top bar       | Filters: Risk Level (multi-select chips), Status, Campaign, Date range. Search by post URL or creator handle.                    |
| Table columns | Creator (@handle + avatar), Post preview snippet, Campaign, Risk Level (colored badge), Risk Score (0–100), Status, Submitted at |
| Row action    | Click row → Submission Detail. Row hover shows a "Quick evidence" tooltip with the top 1–2 evidence sentences.                   |
| Bulk toolbar  | Appears when rows are selected: Export CSV, Assign campaign (future)                                                             |
| Empty state   | "No submissions yet — submit your first X post" with a call-to-action button                                                     |

#### Behavior & Notes

- Default sort: newest first; reviewers can sort by Risk Score descending to triage worst-first.

- Rows for status=analyzing show an animated "Analyzing…" pill instead of a score.

- Rows for status=failed show a "Retry" action and a short failure reason.

### 4.3 Submission Detail (Risk Score & Evidence)

The core explainability screen. Shows the full Risk Score breakdown backed by Evidence — this is what a fraud reviewer opens to make a decision.

**Accessible to:** Campaign Manager, Fraud Reviewer, Agency Admin

#### Layout

| **Region**            | **Content**                                                                                                                                                                                                             |
|-----------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Header                | Creator handle + avatar, link to the original X post, campaign name, submission timestamp                                                                                                                               |
| Score panel           | Large Risk Score (0–100) with colored Risk Level badge and a short one-line plain-language summary, e.g. "High risk — signs of purchased engagement"                                                                    |
| Evidence list         | Ordered list of Evidence entries, each with: category icon (Post / Account / Engagement / Audience / Behavior), severity badge, and a plain-language summary sentence — sourced directly from Finding.summary (RLS §10) |
| Post context panel    | Embedded read-only preview of the X post (via X’s oEmbed) and basic public post metrics                                                                                                                                 |
| Creator context panel | Account age, follower count, and prior submissions from this creator (from the Campaign Intelligence Layer), shown as historical context — not as a score                                                               |
| Reviewer actions      | Optional free-text reviewer note (persisted, not fed back into scoring in MVP); "Mark reviewed" toggle                                                                                                                  |

#### Behavior & Notes

- Evidence entries never show internal weight/confidence numbers — only the human-readable summary and a severity badge, consistent with the DES internal/external boundary.

- If status=failed, this screen shows the failure reason and a Retry button instead of a score.

- A visible "How is this calculated?" link opens a short explainer panel describing the analyzer categories in plain language (no thresholds or formulas).

### 4.4 Campaigns

List and manage campaign references used to group submissions.

**Accessible to:** Campaign Manager, Agency Admin

#### Layout

| **Region**        | **Content**                                                              |
|-------------------|--------------------------------------------------------------------------|
| List              | Campaign name, external ID, status, submission count, average Risk Score |
| Create/Edit modal | Name, external campaign ID (optional), status                            |

#### Behavior & Notes

- Clicking a campaign opens the Submissions Queue pre-filtered to that campaign.

### 4.5 Audit Log

Read-only, filterable feed of security- and operationally-relevant events (FR-010).

**Accessible to:** Agency Admin, Fraud Reviewer

#### Layout

| **Region** | **Content**                                          |
|------------|------------------------------------------------------|
| Filters    | Action type, actor, date range                       |
| Table      | Timestamp, Actor (user or API key), Action, Resource |

#### Behavior & Notes

- Read-only — no edit or delete affordances anywhere on this screen, since audit_logs is append-only.

### 4.6 Settings — API Keys

Create and revoke API keys used for programmatic submission.

**Accessible to:** Agency Admin only

#### Layout

| **Region**   | **Content**                                                                                                                            |
|--------------|----------------------------------------------------------------------------------------------------------------------------------------|
| List         | Key name, key prefix (e.g. ci_live_8f2a…), scopes, last used, created, revoke action                                                   |
| Create modal | Name + scope checkboxes; on success, shows the full secret exactly once with a copy button and a "you will not see this again" warning |

#### Behavior & Notes

- Revoking a key is immediate and irreversible; confirm with a destructive-action dialog.

### 4.7 Settings — Users & Roles

Invite and manage dashboard users and their RBAC role.

**Accessible to:** Agency Admin only

#### Layout

| **Region**   | **Content**                                                                         |
|--------------|-------------------------------------------------------------------------------------|
| List         | Email, role, status, last login                                                     |
| Invite modal | Email + role selector (see Authentication & Authorization Design for the role list) |

## 5. Visual Design Tokens

| **Risk Level** | **Score Range** | **Color**        |
|----------------|-----------------|------------------|
| Low            | 0–24            | Green (#2E7D32)  |
| Moderate       | 25–49           | Yellow (#F9A825) |
| High           | 50–74           | Orange (#E65100) |
| Critical       | 75–100          | Red (#C62828)    |

Exact score-range boundaries are owned by the Rule Library Specification / Risk Aggregator and may be tuned; the UI reads riskLevel from the API rather than recomputing it from riskScore.

## 6. Responsive & Accessibility Notes

- Dashboard is desktop-first (primary users work from a review desk) but the Submissions Queue and Submission Detail must remain usable at tablet widths.

- Risk Level is never conveyed by color alone — always paired with a text label and, where compact, an icon, for color-blind accessibility.

- All interactive elements are keyboard-navigable; the Submission Detail evidence list is screen-reader friendly (semantic list, not styled divs).
