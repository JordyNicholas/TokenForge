# TokenForge — agent / collaborator guide

## What this is

Enterprise **AI Coding FinOps** for metered AI coding agents / LLMs: Detect → Fix → Prove.
Logic is **provider-agnostic**; Fix applies findings through pluggable adapters.

Read first:

1. [`docs/CONCEPT_BRIEF.md`](docs/CONCEPT_BRIEF.md) — locked product narrative (not Auto Memory)
2. [`docs/SOLUTION_DESIGN.md`](docs/SOLUTION_DESIGN.md) — stack + MVP design
3. [`docs/EXTENSION_CONTEXT_GUARD.md`](docs/EXTENSION_CONTEXT_GUARD.md) — VS Code Detect UX (Context Guard)
4. [`docs/PROJECT_PR_WORKFLOW.md`](docs/PROJECT_PR_WORKFLOW.md) — Issues ↔ PRs ↔ board
5. [`docs/BOARD.md`](docs/BOARD.md) — epic/story map; F2 Prove attractiveness waves
6. [`docs/USAGE_RECONCILIATION_PLAN.md`](docs/USAGE_RECONCILIATION_PLAN.md) — estimate vs actual usage (Wave A→C)
7. [`docs/PILOT_RUNBOOK.md`](docs/PILOT_RUNBOOK.md) — one-team baseline → apply → import bill

## Delivery rules

- Every change maps to an **existing Issue**.
- Branch: `TF#<n>-slug` (or `TOKENFORGE#<n>`).
- PR body must include `Closes #<n>` (automation will append if missing).
- PRs must be **green on CI** (`typecheck` + `test` + `build`) before merge.
  Run `npm run typecheck && npm test` locally first — CI is a backstop, not the
  first time anyone finds out.
- Board: To-Do → In Progress → Ready for Review → Done.
- Epics titled `[Epic] …` close into **Epics Finished**, not Done — including when the last child story closes.

## Stack

TypeScript everywhere: `packages/risk-core`, `cli/`, `extension/`, React `dashboard/`.

## Architecture

**Ports and adapters/Hexagonal Architecture.** `packages/risk-core` is the kernel (estimate, score, types).
Extension / CLI / dashboard are adapters. They integrate through the Token Risk
JSON file contract, not by calling each other. Provider file formats belong only
in CLI adapters.

Do **not** import VS Code, React, CLI frameworks, or vendor SDKs into `risk-core`.
Do **not** import across delivery surfaces (extension ↛ CLI ↛ dashboard).

Full write-up: [`docs/SOLUTION_DESIGN.md`](docs/SOLUTION_DESIGN.md#architecture).

## Provider independence

- Do **not** hard-wire product identity or `risk-core` to a single vendor (Copilot, Cursor, Claude, etc.).
- CLI Fix path uses **adapters**; MVP may implement one default adapter and stub others.
- Dashboard cost math uses editable assumptions, not a single vendor billing API.

## Honesty constraints

- Do not claim interception of any agent/LLM’s private context pipeline.
- Pitch Chat/Agent / metered AI-credit workflows, not unlimited completions metering.
- “30%” is scenario-based via the dashboard calculator.
- Default scan is heuristic (no AI). Optional hybrid enrichment uses local or external LLMs on a bounded candidate set — see [`docs/HYBRID_SCAN_DESIGN.md`](docs/HYBRID_SCAN_DESIGN.md).
