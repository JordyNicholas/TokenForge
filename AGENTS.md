# TokenForge — agent / collaborator guide

## What this is

Enterprise **AI Coding FinOps** for metered AI coding agents / LLMs: Detect → Fix → Prove.
Logic is **provider-agnostic**; Fix applies findings through pluggable adapters.

Read first:

1. [`docs/CONCEPT_BRIEF.md`](docs/CONCEPT_BRIEF.md) — locked product narrative (not Auto Memory)
2. [`docs/SOLUTION_DESIGN.md`](docs/SOLUTION_DESIGN.md) — stack + MVP design
3. [`docs/PROJECT_PR_WORKFLOW.md`](docs/PROJECT_PR_WORKFLOW.md) — Issues ↔ PRs ↔ board

## Delivery rules

- Every change maps to an **existing Issue**.
- Branch: `TF#<n>-slug` (or `TOKENFORGE#<n>`).
- PR body must include `Closes #<n>` (automation will append if missing).
- Board: To-Do → In Progress → Ready for Review → Done.
- Epics titled `[Epic] …` close into **Epics Finished**, not Done.

## Stack

TypeScript everywhere: `packages/risk-core`, `cli/`, `extension/`, React `dashboard/`.

## Provider independence

- Do **not** hard-wire product identity or `risk-core` to a single vendor (Copilot, Cursor, Claude, etc.).
- CLI Fix path uses **adapters**; MVP may implement one default adapter and stub others.
- Dashboard cost math uses editable assumptions, not a single vendor billing API.

## Honesty constraints

- Do not claim interception of any agent/LLM’s private context pipeline.
- Pitch Chat/Agent / metered AI-credit workflows, not unlimited completions metering.
- “30%” is scenario-based via the dashboard calculator.
