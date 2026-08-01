---
activation: always_on
description: Module boundaries and architectural invariants for the Campaign Integrity API. Applies to all backend and frontend code changes.
---

# Architecture Rules

Full detail: `docs/specs/05_Backend_Folder_Structure_Specification.md`,
`docs/specs/06_Frontend_Folder_Structure_Specification.md`,
`docs/specs/01_Database_Design_and_ERD_Specification_DDS.md`.

## Backend module boundaries

- A module never imports another module's repository or entity
  directly — only its exported service. This keeps the Detection
  Engine swappable without touching `submissions` or the API layer.
- Only `detection/evidence` and `submissions` may construct the
  public-facing response shape. Every other module works with internal
  entities and returns them to a caller that does the shaping.
- Detection rule files (`detection/rules/**`) never import NestJS
  decorators. They are plain functions/classes, unit-testable without
  DI or a database, per `10_Testing_Strategy.md` §3.1.

## The Detection Engine pipeline — do not shortcut

```
collect → validate → analyze (analyzers run rules → Finding[]) →
aggregate (Finding[] → riskScore + riskLevel) →
evidence (Finding[] → public Evidence[], strips internal-only fields)
```

- Every rule produces a `Finding`. Never have a rule write directly to
  `riskScore`, mutate an aggregate, or return anything other than
  `Finding[]`.
- `risk-aggregator.service.ts` is the *only* place that turns
  `Finding[]` into a numeric score. Do not compute risk scores inline
  in a controller, analyzer, or DTO mapper.
- `evidence-generator.service.ts` is the *only* place that strips
  internal-only fields for public consumption. Do not build a second
  ad hoc "public shape" elsewhere — route through it.

## Rules are code, not data

- Rule definitions are version-controlled TypeScript files under
  `detection/rules/<analyzer>/`, named by id
  (e.g. `E001-new-account-burst.rule.ts`), matching
  `docs/specs/05_Backend_Folder_Structure_Specification.md` §5.
- There is no `rules` database table and no runtime rule-editing
  feature. `findings.rule_id` and `findings.rule_version` are plain
  strings that reference code, not foreign keys.
- Never propose "store rules in the database for flexibility" — this
  was deliberately rejected; see the DDS design principles.

## Database

- Every new table that is agency-owned carries an `agency_id` column
  (see DDS §2, "Multi-tenancy via agency_id"). If you add a table
  without one, justify why in the PR description.
- `analyses`, `findings`, and `audit_logs` are append-only. Never write
  an `UPDATE` against these tables in application code — re-analysis
  creates a new `analyses` row, it does not mutate an old one.
- Schema changes are migration files, reviewed in the same PR as the
  code that needs them. Never hand-edit the database in staging or
  production outside a migration.

## Frontend

- `RiskScoreBadge.tsx` and `EvidenceList.tsx` are the *only* components
  allowed to read `riskLevel` / `severity` values directly and map them
  to color/label. Every other component receives already-formatted
  props. If you're writing a new screen that shows risk, reuse these —
  don't reimplement the color mapping.
- All API calls go through `lib/api-client/` — no component calls
  `fetch()` directly. This is what keeps the `{ error: {...} } ` shape
  handled in one place.
- The dashboard is poll-based in MVP (see `02_API_Specification_OAS.md`
  §12). Do not introduce WebSockets or a webhook receiver unless the
  spec is updated first — it's an explicit out-of-scope item.

## When you're not sure where something goes

Check the folder-structure spec for the nearest existing analog first.
If genuinely novel, propose a location and state which existing module
boundary rule (above) it respects, rather than placing it wherever is
locally convenient.
