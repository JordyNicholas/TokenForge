# Concept Brief — TokenForge

*(Hackathon one-pager · board / team aligned)*

## Category

**AI Coding FinOps** — cost & token governance for metered GitHub Copilot, not assistant memory.

## Problem

Large IT orgs overspend on Copilot **AI credits** because low-value context (inactive giant tabs, lockfiles/configs, fat always-on instructions, missing exclusions) inflates Chat/Agent-style usage. Managers lack a clear loop to **see → fix → prove** savings.

## One-liner

> TokenForge detects high-cost, low-value context in the IDE and repo, removes it via Copilot-native exclusions and lean instructions, and proves tokens/$ saved to engineering managers.

## Who it’s for

| Role | Relationship |
| --- | --- |
| Eng Manager / FinOps | **Buyer** — ROI, team waste, projected $ |
| Developer | **User** — IDE risk signal + one-click repo fix |
| Platform / DevEx | **Rollout** — CLI + policy pack at scale |

## Core loop (the product)

**Token Risk → Policy Pack → Savings Proof**

1. **Detect** — score risky open tabs / paths (size × inactivity × filetype)
2. **Fix** — filter inactive tabs; write lean `copilot-instructions` + content exclusions
3. **Prove** — Tokens Saved ROI dashboard (simulated OK for MVP)

## MVP (organiser-aligned)

1. **VS Code extension** — recommend/filter background tabs inactive ≥15 minutes (high-risk filetypes prioritized)
2. **CLI** — one command drops token-optimised settings, lean instructions, strict exclusion candidates + before/after estimate
3. **ROI dashboard** — mock analytics of tokens avoided and $ across a business unit

## In / out of scope

| In (ship) | Out (roadmap / don’t pitch first) |
| --- | --- |
| Tab risk + 15‑min rule | Claiming we intercept Copilot’s private pipeline |
| Repo optimisation pack | Full Auto Memory–style learnings store |
| Simulated ROI + assumptions | Live billing API sync |
| Cost-first narrative | Chat compaction / premium model router as headlines |

## Success for the pitch

- Demo ≤5 min: noisy IDE → risk drops → CLI pack → dashboard shows ~**30%** reduction on a **scripted scenario**
- Judges leave with: “FinOps for Copilot context waste”

## Not Claude Auto Memory

| Auto Memory | TokenForge |
| --- | --- |
| Remembers useful project knowledge | Stops **paying** for useless context |
| Enriches continuity for one agent | Cuts **billable** waste for the **enterprise** |
| `MEMORY.md` / learnings | Exclusions + lean instructions + **$ saved** |
| Quality / continuity metric | **Tokens avoided / AI credits / $** metric |

**Sound bite:** *They help the agent remember. We help the organisation stop bleeding tokens.*

## Innovation (within hackathon honesty)

Not a new memory system — a **governable Token Risk model** wired to real Copilot levers (exclusions, instructions, IDE hygiene) and a manager-facing savings proof.

## Non-goals / honesty

- Completions ≠ same metering as Chat/Agent — pitch credit-consuming workflows
- Extension **advises / filters recommended context**; repo exclusions are the hard enforce path
- “30%” = transparent calculator on a demo scenario, not a universal guarantee
