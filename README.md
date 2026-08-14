# TokenForge

Enterprise Copilot **cost & token optimiser** for large IT organisations.

TokenForge helps teams cut “token bleed” in developer workflows: detect high-cost, low-value IDE/repo context, apply Copilot-native exclusions and lean instructions, and prove tokens/$ saved to engineering managers.

> **Category:** AI Coding FinOps — not assistant memory.

## Concept

See the full one-pager: [`docs/CONCEPT_BRIEF.md`](docs/CONCEPT_BRIEF.md)

**Core loop:** Token Risk → Policy Pack → Savings Proof

## MVP (hackathon)

| Component | Path | Role |
| --- | --- | --- |
| VS Code extension | `extension/` | Score & filter inactive / high-risk background tabs (≥15 min) |
| CLI | `cli/` | One-click repo optimisation (instructions + exclusions + estimate) |
| ROI dashboard | `dashboard/` | Mock “tokens saved” analytics across a business unit |

## Status

Hackathon scaffold — concept brief locked; solution design next.

## Not Claude Auto Memory

Auto Memory helps an agent **remember useful facts**. TokenForge helps enterprises **stop paying for useless context**.
