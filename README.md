# TokenForge

Enterprise **AI Coding FinOps** — cost & token optimiser for large IT organisations, independent of which coding agent / LLM teams use.

TokenForge helps teams cut “token bleed” in developer workflows: detect high-cost, low-value IDE/repo context, apply **provider-native** lean instructions and exclusions via adapters, and prove tokens/$ saved to engineering managers.

> **Category:** AI Coding FinOps — not assistant memory.

## Links

| Resource | URL |
| --- | --- |
| Project board | [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2) |
| Epic / story map | [`docs/BOARD.md`](docs/BOARD.md) |
| Concept brief | [`docs/CONCEPT_BRIEF.md`](docs/CONCEPT_BRIEF.md) |
| Solution design | [`docs/SOLUTION_DESIGN.md`](docs/SOLUTION_DESIGN.md) |
| PR ↔ board workflow | [`docs/PROJECT_PR_WORKFLOW.md`](docs/PROJECT_PR_WORKFLOW.md) |
| Collaborator guide | [`AGENTS.md`](AGENTS.md) |

## Core loop

**Token Risk → Policy Pack → Savings Proof**

Detect and Prove are provider-agnostic. Fix uses pluggable adapters (Copilot, Cursor, Claude/Codex, generic, …).

## MVP

| Component | Path | Role |
| --- | --- | --- |
| VS Code extension | `extension/` | Score & filter inactive / high-risk background tabs (≥15 min) |
| CLI (TypeScript) | `cli/` | One-click repo optimisation (adapter instructions + exclusions + estimate) |
| ROI dashboard (React) | `dashboard/` | Mock “tokens saved” analytics across a business unit |
| Shared risk helpers | `packages/risk-core/` | Token estimate + risk scoring types |

## Delivery

- Issues + Epics on the project board (phases E0–E5, Future)
- Branch `TF#<issue>` → PR with `Closes #<n>` → auto-close on merge
- Board automation mirrors Flux (see `docs/PROJECT_PR_WORKFLOW.md`)

## Setup note

Add repository secret **`PROJECT_TOKEN`** (PAT with Projects:write) so board Status sync works. Issue auto-link via `Closes #` still works without it.
