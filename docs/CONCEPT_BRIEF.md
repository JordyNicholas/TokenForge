# Concept Brief — TokenForge

*(Hackathon one-pager · board / team aligned)*

See [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md) for the ≤5-min live demo script.

## Category

**AI Coding FinOps** — cost & token governance for metered AI coding agents / LLMs, not assistant memory.

## Problem

Large IT orgs overspend on **AI coding credits / metered usage** because low-value context (inactive giant tabs, lockfiles/configs, fat always-on instructions, missing exclusions) inflates Chat/Agent-style workflows—regardless of which vendor agent is in use. Managers lack a clear loop to **see → fix → prove** savings.

## One-liner

> TokenForge detects high-cost, low-value context in the IDE and repo, removes it via provider-native policy packs (lean instructions + exclusions), and proves tokens/$ saved to engineering managers.

## Who it’s for

| Role | Relationship |
| --- | --- |
| Eng Manager / FinOps | **Buyer** — ROI, team waste, projected $ |
| Developer | **User** — IDE risk signal + one-click repo fix |
| Platform / DevEx | **Rollout** — CLI + policy pack at scale |

## Core loop (the product)

**Token Risk → Policy Pack → Savings Proof**

1. **Detect** — score risky open tabs / paths (size × inactivity × filetype) — **provider-agnostic**; optional Phase 2 **hybrid** pass adds local or external LLM semantic enrichment on a bounded candidate set ([`docs/HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md))
2. **Fix** — filter inactive tabs; write lean agent instructions + content exclusions via a **provider adapter** (same findings, different output files)
3. **Prove** — Tokens Saved ROI dashboard (simulated OK for MVP; cost knobs are assumption inputs)

System shape (ports and adapters, shared kernel, file JSON contract):
[`docs/SOLUTION_DESIGN.md`](./SOLUTION_DESIGN.md#architecture).

## Provider independence

TokenForge logic (risk scoring, scan reports, ROI math) must not hard-depend on a single AI vendor.

| Layer | Binding |
| --- | --- |
| Detect / risk-core / JSON contract | **Agnostic** — works for any Chat/Agent workflow |
| Detect LLM enrichers (Phase 2) | **Pluggable** — local (Ollama/Qwen) or org-approved external models; default scan stays heuristic |
| Fix adapters | **Pluggable** — e.g. GitHub Copilot instructions/exclusions, Cursor rules, Claude/Codex instruction files, generic ignore packs |
| Prove / dashboard | **Agnostic** — editable rate / credits / msgs; not vendor-locked metering APIs |

MVP may ship **one adapter first** (commonly Copilot) for the demo; that choice is a default, not the product identity.

## MVP (organiser-aligned)

1. **VS Code extension** — recommend/filter background tabs inactive ≥15 minutes (high-risk filetypes prioritized)
2. **CLI** — one command drops token-optimised settings, lean instructions, strict exclusion candidates + before/after estimate (via selected provider adapter)
3. **ROI dashboard** — mock analytics of tokens avoided and $ across a business unit

## In / out of scope

| In (ship) | Out (roadmap / don’t pitch first) |
| --- | --- |
| Tab risk + 15‑min rule | Claiming we intercept any vendor’s private context pipeline |
| Repo optimisation pack (adapter outputs) | Full Auto Memory–style learnings store |
| Simulated ROI + assumptions | Live billing API sync for a single vendor |
| Cost-first narrative | Chat compaction / premium model router as headlines |

## Success for the pitch

- Demo ≤5 min: noisy IDE → risk drops → CLI pack → dashboard shows ~**30%** reduction on a **scripted scenario**
- Judges leave with: “FinOps for AI coding context waste” (works across agents, not one brand)

## Not Claude Auto Memory

| Auto Memory | TokenForge |
| --- | --- |
| Remembers useful project knowledge | Stops **paying** for useless context |
| Enriches continuity for one agent | Cuts **billable** waste for the **enterprise** |
| `MEMORY.md` / learnings | Exclusions + lean instructions + **$ saved** |
| Quality / continuity metric | **Tokens avoided / AI credits / $** metric |

**Sound bite:** *They help the agent remember. We help the organisation stop bleeding tokens.*

## Innovation (within hackathon honesty)

Not a new memory system — a **governable Token Risk model** wired to real IDE/repo levers (exclusions, lean instructions, IDE hygiene) through **provider adapters**, plus a manager-facing savings proof.

## Non-goals / honesty

- Completions ≠ same metering as Chat/Agent — pitch credit-consuming / metered workflows
- Extension **advises / filters recommended context**; repo exclusions are the hard enforce path
- Do not claim interception of any agent/LLM’s private context pipeline
- “30%” = transparent calculator on a demo scenario, not a universal guarantee
