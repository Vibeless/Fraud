# Frontend Folder Structure Specification

*FFS — Frontend Folder Structure*

**Project:** Campaign Integrity API

**Version:** 1.0 (Draft)

**Status:** Draft

**Based On:** TAS v1.0 (Next.js dashboard), Dashboard UI/UX Specification v1.0

## 1. Purpose

This document defines the Next.js (App Router) project layout for the dashboard, so the screens defined in the Dashboard UI/UX Specification map cleanly onto routes, and risk/evidence display logic is centralized rather than duplicated per screen.

## 2. Top-Level Layout
```
campaign-integrity-dashboard/
├─ app/
├─ components/
├─ lib/
├─ styles/
├─ public/
├─ tests/
├─ .env.example
├─ Dockerfile
└─ package.json
```
## 2. app/ — Routes

Maps directly to the Information Architecture in the Dashboard UI/UX Specification §3.
```
app/
├─ layout.tsx // root layout, providers
├─ (auth)/
│ └─ login/page.tsx // §4.1 Login
└─ (dashboard)/
├─ layout.tsx // left nav + top bar shell
├─ submissions/
│ ├─ page.tsx // §4.2 Submissions Queue
│ └─ [id]/page.tsx // §4.3 Submission Detail
├─ campaigns/
│ ├─ page.tsx // §4.4 Campaigns
│ └─ [id]/page.tsx
├─ audit-log/page.tsx // §4.5 Audit Log
└─ settings/
├─ api-keys/page.tsx // §4.6
└─ users/page.tsx // §4.7
```
## 3. components/
```
components/
├─ ui/ // design-system primitives: Button, Badge, Modal, Table, Card
├─ risk/
│ ├─ RiskScoreBadge.tsx // the single component that maps riskLevel → color (DUXS §5)
│ ├─ EvidenceList.tsx // renders Evidence[] from the API, category icon + severity + summary
│ └─ RiskExplainerPanel.tsx // the "How is this calculated?" plain-language panel
├─ submissions/
│ ├─ SubmissionsTable.tsx
│ ├─ SubmissionFilters.tsx
│ └─ SubmitPostForm.tsx
├─ campaigns/
├─ audit/
└─ layout/
├─ NavSidebar.tsx
└─ TopBar.tsx
```
RiskScoreBadge and EvidenceList are deliberately the only components allowed to read riskLevel/severity values — every other component receives already-formatted props, so a future change to color tokens or evidence layout touches two files, not every screen.

## 4. lib/
```
lib/
├─ api-client/
│ ├─ client.ts // fetch wrapper: base URL, auth header, error unwrapping
│ ├─ submissions.ts // typed calls to /v1/submissions*
│ ├─ analyses.ts
│ ├─ campaigns.ts
│ └─ audit.ts
├─ auth/
│ ├─ session.ts // reads/refreshes JWT, per Authentication & Authorization Design
│ └─ useCurrentUser.ts
├─ hooks/
│ ├─ useSubmissions.ts // polling hook — dashboard is poll-based in MVP, no websockets
│ └─ usePermissions.ts // role → UI affordance checks mirroring AAD §5.2
└─ utils/
├─ formatDate.ts
└─ riskLevel.ts // shared color/label lookup table, single source of truth
```
## 5. Data Fetching Strategy

- Server Components fetch initial page data (e.g. the first page of the Submissions Queue) directly from the API using the caller’s session cookie, avoiding a client-side loading flash.

- useSubmissions polls GET /v1/submissions?status=analyzing at a short interval only for rows currently analyzing, matching the poll-based API design (no websockets/webhooks in MVP).

- All API calls go through lib/api-client — no component calls fetch() directly — so the standard { error: {...} } shape from the API Specification is handled in exactly one place.

## 6. Styling

Tailwind CSS utility classes with a small shared design-token file (colors, spacing) so the Risk Level palette in the Dashboard UI/UX Specification is defined once and consumed everywhere, rather than hard-coded per component.

## 7. tests/
```
tests/
├─ unit/ // component tests (React Testing Library)
├─ integration/ // page-level tests against a mocked API client
└─ e2e/ // Playwright, against a running dashboard + staging API
```
