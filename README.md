# Campaign Integrity API — Antigravity Project Setup

This is a **drop-in agent-configuration package**, not application code
yet. It's built to make Google Antigravity (Gemini) build this project
correctly instead of improvising — most importantly on security and
architecture, where "vibe coded and looks like it works" and "actually
safe" are not the same thing.

## What's in here and why

```
AGENTS.md                  ← Antigravity reads this every session (orientation + non-negotiables)
.agents/rules/              ← Always-on rules, split so each stays focused and under the 12k char limit
  10-architecture.md         module boundaries, the Detection Engine pipeline, DB conventions
  20-security.md             auth, secrets, data-exposure boundary, input validation — read this one twice
  30-engineering-standards.md API contract, migrations, testing requirements, logging
.agents/skills/              ← Loaded on demand for specific repeated tasks
  add-detection-rule/         the exact steps + required tests for adding a rule
  add-api-endpoint/           the exact steps for adding an endpoint safely
docs/specs/                  ← The 10 Phase 2/3 design docs, as markdown (agent-readable) + PNG diagrams
.env.example                 ← Secret placeholders — copy to .env, never commit .env
.gitignore
```

## How to use this

1. **Copy this entire folder structure into your actual project repo
   root** (or `git init` here and start from this as your repo root —
   either works). Commit `AGENTS.md`, `.agents/`, `docs/`,
   `.env.example`, and `.gitignore`. Never commit a real `.env`.
2. Open the repo in Antigravity. It will pick up `AGENTS.md`
   automatically and read `.agents/rules/*.md` as Always On context.
3. When you ask it to build something, point it at the relevant spec
   explicitly the first few times — e.g. *"Implement
   `POST /v1/submissions` per `docs/specs/02_API_Specification_OAS.md`,
   following `.agents/skills/add-api-endpoint/SKILL.md`."* This trains
   the habit of spec-first building; after a few rounds it generalizes.
4. When adding a detection rule or an endpoint specifically, mention
   the relevant skill by name — Antigravity's model-decision activation
   should pick it up from the task context too, but an explicit
   `@add-detection-rule` (or your IDE's mention syntax) is a safe bet
   early on.
5. **Because Antigravity's agent context resets between sessions**,
   these files are what carries your architecture decisions forward —
   not your memory of the last conversation. If you notice the agent
   drifting (e.g. building a `rules` database table, or a component
   reading `riskLevel` outside `RiskScoreBadge`), that's a sign to
   strengthen a rule file, not just correct it inline.

## What's still your job

- The original PRD, SRS, TAS, Detection Engine Specification, Rule
  Library Specification, Detection Signal Research, and X API
  Capability Analysis (your Phase 1 docs) aren't in `docs/specs/` yet.
  Worth adding them the same way if you want the agent to reason about
  *why* the system works this way, not just *how* it's structured.
- These rules encode what's in the docs as of today. If you change a
  spec, update the corresponding rule file in the same change —
  otherwise the agent will keep following the stale rule.
- This package doesn't include actual scaffolding (`package.json`,
  NestJS/Next.js boilerplate, initial migration). That's Phase 4 —
  happy to generate that next when you're ready.
