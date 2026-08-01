---
name: add-detection-rule
description: Use when adding or modifying a Detection Engine rule (post, account, engagement, audience, behavior, or historical analyzer). Ensures the rule follows the Finding contract, file/id conventions, and the mandatory positive/negative/boundary test matrix.
---

# Adding a Detection Rule

Read first: `docs/specs/05_Backend_Folder_Structure_Specification.md` §5,
`docs/specs/10_Testing_Strategy.md` §3.1, `.agents/rules/10-architecture.md`.

## 1. Confirm the id and placement

Rule ids are prefixed by analyzer: `P-xxx` (post), `A-xxx` (account),
`E-xxx` (engagement), `U-xxx` (audience), `B-xxx` (behavior), `H-xxx`
(historical). Pick the next free number in that prefix — check existing
files in `backend/src/modules/detection/rules/<analyzer>/` before
assigning one; don't guess or reuse.

File path: `rules/<analyzer>/<ID>-<kebab-case-description>.rule.ts`
e.g. `rules/engagement/E001-new-account-burst.rule.ts`.

## 2. Write the rule as a plain function — no framework imports

Rule files never import NestJS decorators. A rule takes the analyzer's
input snapshot and returns `Finding[]` (usually zero or one Finding).
It must NOT:
- write to a database or call a repository directly
- compute or return a `riskScore`
- import anything from `common/`, `queue/`, or another module's
  service

It MUST:
- return a `Finding` shaped per `docs/specs/01_Database_Design_and_ERD_Specification_DDS.md`
  `findings` entity: `finding_id`, `rule_id`, `analyzer`, `category`,
  `severity`, `confidence`, `summary` (human-readable, reviewer-facing —
  this becomes public Evidence text, so write it in plain language, no
  jargon, no internal metric names), `details` (internal-only —
  supporting measurements, never exposed), `is_internal_only` (true if
  this Finding should influence scoring but never surface as Evidence),
  `rule_version`.

## 3. Write the three required test cases

No exceptions — a rule PR without all three is incomplete:

1. **Positive** — construct fixture input that should clearly trigger
   the rule; assert the expected `Finding` is produced with the right
   `severity`/`confidence`.
2. **Negative** — construct fixture input that is clearly clean;
   assert no `Finding` (or an explicitly non-triggering result) is
   produced.
3. **Boundary** — construct fixture input exactly at the rule's
   threshold (e.g., an account exactly at the age cutoff) and assert
   the chosen behavior is deliberate, not an off-by-one accident.

Tests run against plain TypeScript fixtures — no NestJS test module, no
database. Place them in `test/rules/<analyzer>/<ID>.spec.ts` mirroring
the source path.

## 4. Bump `rule_version` and note it in the PR

Per `docs/specs/07_CICD_Strategy.md` §7, a rule change branch is
`rule/*`, requires a second reviewer with Detection Engine context, and
must record the `rule_version` bump so any Risk Score produced after
merge is traceable to the exact rule set that produced it.

## 5. Double-check the security boundary

`summary` is the only field a reviewer will ever see through the API.
Before finishing, re-read the `summary` text and confirm it contains no
raw metric values, weights, or thresholds that should have stayed in
`details` — that's the DES §9 internal/external boundary, and it's
easy to violate by accident when writing a "helpful" summary sentence.

## 6. Don't touch the aggregator or evidence generator

Adding a rule should never require editing
`risk-aggregator.service.ts` or `evidence-generator.service.ts` — they
consume `Finding[]` generically. If you find yourself editing either
one just to accommodate a new rule, stop; that's a sign the rule isn't
following the `Finding` contract correctly.
