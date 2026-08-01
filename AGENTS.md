# AGENTS.md — Campaign Integrity API

This file is read by the agent at the start of every session. It orients you to the project
and points to the specs that are the actual source of truth. Do not re-derive architecture
decisions from scratch — they've already been made and documented. Read the relevant spec
before writing code.

## What this project is

An API-first platform that gives Web3 campaign agencies an explainable **Risk Score (0–100)**
for X (Twitter) posts submitted for a campaign, backed by human-readable **Evidence** — never
a "bot / not bot" verdict. The Detection Engine runs a pipeline (collect -> validate -> analyze ->
aggregate -> generate evidence) against post/account/engagement data pulled from X, using
versioned, code-based rules. Final decisions always stay with a human reviewer.

## Tech stack

- **Backend:** NestJS + TypeScript, PostgreSQL, Redis, BullMQ (async job queue)
- **Frontend:** Next.js (App Router) + TypeScript, Tailwind CSS
- **Detection Engine:** rule-based; rules are version-controlled TypeScript files, not database rows
- **Deploy target:** containerized, cloud-agnostic (see `docs/specs/08_Deployment_Architecture.md`)

## Source of truth — read before you build

Everything under `docs/specs/` was produced from an approved PRD/SRS/TAS/Detection-Engine-Spec/
Rule-Library-Spec chain. **If generated code and a spec disagree, the spec wins — stop and flag
the conflict instead of silently resolving it in either direction.**

| File | Read this before... |
|---|---|
| `01_Database_Design_and_ERD_Specification_DDS.md` | touching any entity, migration, or query |
| `02_API_Specification_OAS.md` | adding/changing any REST endpoint |
| `03_Dashboard_UX_Specification_DUXS.md` | building any dashboard screen or component |
| `04_Authentication_Authorization_Design_AAD.md` | touching auth, guards, roles, API keys |
| `05_Backend_Folder_Structure_Specification.md` | deciding where a new backend file goes |
| `06_Frontend_Folder_Structure_Specification.md` | deciding where a new frontend file goes |
| `07_CICD_Strategy.md` | branching, PR gates, migrations in CI |
| `08_Deployment_Architecture.md` | anything about how/where this runs |
| `09_Logging_Monitoring_Strategy.md` | adding logs, metrics, or alerts |
| `10_Testing_Strategy.md` | deciding what tests a change needs |

> The originating product/requirements docs (PRD, SRS, TAS, Detection Engine Spec, Rule
> Library Spec, Detection Signal Research, X API Capability Analysis) are the upstream source
> for everything above. If they're not yet in `docs/specs/` as markdown, treat the Word/PDF
> versions the team has as equally authoritative — ask for them rather than guessing at rule
> thresholds, signal definitions, or scope boundaries.

## Non-negotiables

These are the rules most likely to get silently violated by an agent trying to make something
"just work." Full detail lives in `.agents/rules/`; this is the condensed version:

1. **Internal detection internals are never exposed.** Analyzer scores, signal weights,
   detection thresholds, and `findings.details` never appear in any API response or UI. Only
   Risk Score, Risk Level, and Evidence summaries are public.
2. **Rules are code, not data.** Detection rules live under
   `src/modules/detection/rules/**` as plain TypeScript. There is no rules table — don't add one.
3. **Every query is agency-scoped.** No service method reads or writes data without filtering
   by `agencyId` resolved from the authenticated request context.
4. **Secrets are never hardcoded or logged**, including inside error stack traces.
5. **Findings, not raw scores, are the unit of detection output.** Every rule produces a
   Finding; the Risk Aggregator and Evidence Generator both read from Findings only.
6. **Schema changes are migration files reviewed in the same PR**, never ad hoc changes
   against a running database.
7. **Detection rule changes require all three test types** (positive, negative, boundary) —
   see `10_Testing_Strategy.md` §3.1. No exceptions, no "I'll add tests later."

## Repo layout (target state)

```
campaign-integrity-api/        # NestJS backend — see docs/specs/05_...
campaign-integrity-dashboard/  # Next.js frontend — see docs/specs/06_...
docs/specs/                    # this project's design & planning docs
.agents/rules/                 # always-on rules for this workspace
.agents/skills/                # repeatable-task playbooks
```

## Workflow expectations

- Before implementing a feature, check the relevant file(s) in `docs/specs/` above.
- Prefer small, reviewable diffs over large multi-file rewrites in one pass.
- After generating code, run lint + typecheck + the relevant test layer before calling the
  task done — don't hand back code you haven't run.
- Adding a detection rule or a new API endpoint are the two most common tasks in this repo;
  use the matching skill in `.agents/skills/` rather than improvising the pattern each time.
- If a request would require guessing at a business rule, a threshold, or a scope boundary
  that isn't in `docs/specs/`, ask rather than inventing a plausible-sounding default —
  Risk Score correctness is the product.
