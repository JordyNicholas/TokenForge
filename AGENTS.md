# TokenForge — agent / collaborator guide

## What this is

Enterprise **AI Coding FinOps** for metered GitHub Copilot: Detect → Fix → Prove.

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

## Honesty constraints

- Do not claim interception of Copilot’s private context pipeline.
- Pitch Chat/Agent / AI-credit workflows, not unlimited completions metering.
- “30%” is scenario-based via the dashboard calculator.
