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

## Development

```bash
npm install
```

npm workspaces: `packages/*`, `cli`, `dashboard`, `extension`. Shared TypeScript
options live in `tsconfig.base.json`. Placeholder packages exist so installs
resolve; real CLI / dashboard / extension / risk-core land in later epics.

```bash
npm run typecheck
```

## Board automation setup

Exact GitHub UI steps (secret, delete-head-branches, Project workflows):
[`docs/PROJECT_PR_WORKFLOW.md`](docs/PROJECT_PR_WORKFLOW.md#collaborator-setup-github-ui).

Repository secret **`PROJECT_TOKEN`** (PAT with Projects:write) is required for
board Status sync. Issue auto-link via `Closes #` still works without it. Reuse
the Flux PAT if it already has Projects:write on JordyNicholas user projects.
