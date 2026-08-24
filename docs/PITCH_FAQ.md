# Pitch FAQ — TokenForge

Short answers for judges and collaborators. Aligns with [`CONCEPT_BRIEF.md`](./CONCEPT_BRIEF.md).
See [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md) for the ≤5-min live demo script.

## Competitive landscape?

| Category | What they optimise | Gap vs TokenForge |
| --- | --- | --- |
| Agent memory / continuity (e.g. Claude Auto Memory, Cursor Memories) | Quality & recall for **one** agent | Do not remove billable low-value context or prove $ saved |
| Cloud / infra FinOps | Cloud $ (compute, K8s, SaaS) | Blind to **IDE/repo AI-context** waste |
| LLM ops / prompt observability | API traces, latency, prompt $ | Not coding-agent **tab + exclusion** governance |
| Vendor usage dashboards | Show Copilot/Cursor spend | Report spend; **do not Detect→Fix** wasteful context |

**Unique wedge:** Token Risk model → provider policy packs → manager-facing $ proof, with **global BU and per-team/repo** Prove across architecture styles (microservices, serverless, data platforms).

## vs Claude Auto Memory?

| Auto Memory | TokenForge |
| --- | --- |
| Remembers useful project knowledge | Stops **paying** for useless context |
| Enriches continuity for one agent | Cuts **billable** waste for the **enterprise** |
| Quality / continuity metric | **Tokens avoided / AI credits / $** |

**Sound bite:** *They help the agent remember. We help the organization stop bleeding tokens.*

## Do you use AI to scan?

**Default: no.** `tokenforge scan` is heuristic — file size, path class, inactivity, and `estTokens ≈ ceil(bytes / 4)`.

**Optional hybrid mode** (`--mode hybrid`) runs the same baseline plus an LLM **enricher** on a bounded candidate set (instruction files, borderline configs, top-N paths). Backends are pluggable:

- **Local** — Ollama / Qwen 2.5-Coder (data stays on machine)
- **External** — Codex CLI with the user's ChatGPT login, or Anthropic with an org-approved key (excerpts may leave the machine)

Token math stays heuristic; the model adds semantic findings and explanations, not primary token counts.

Full design: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md).

## Do you intercept the agent’s context pipeline?

**No.** We score open tabs and repo paths, recommend hygiene, and write exclusion/instruction policy files. We do not hook into any vendor’s private Chat/Agent pipeline.

## Where does the ~30% come from?

Scenario math on the dashboard assumptions panel (rate, team size, msgs/day, model mix) applied to demo scan totals — not a universal production SLA. See `fixtures/expected/noisy-app-totals.json` and `dashboard/public/demo-seed.json`.

Demo seed also includes **imported usage** credits/$ (issue #27 thin) — file/demo import, not live vendor billing APIs.

## Estimate vs actual billed usage?

**Today:** Prove projects $ from scan totals × editable assumptions, and can show **imported** usage beside that projection. Before/after Fix compare is a **local scan snapshot** diff — not the vendor invoice.

**Next (F2 / #61):** Wave A adds FinOps export import + baseline/after variance; Wave B adds per-provider live usage adapters + a variance board; Wave C adds apply markers, cohorts, and assumption calibration. Plan: [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md).

**Honesty:** we reconcile **estimated** context-waste savings with **period billed usage**. We do not meter the agent’s private pipeline.

## Completions vs Chat/Agent metering?

TokenForge targets **metered Chat/Agent / AI-credit** workflows where context size drives cost — not unlimited inline completions.

## Per-team vs global Prove?

Dashboard **Global** rolls up the business unit. Sidebar **Scope** opens one team/repo. Architecture tags (microservices, serverless, data-platform) show waste across estate styles. Assumptions stay BU-global.

## Pitch deck

Regenerate: `python3 scripts/generate-pitch-deck.py` → [`pitch/TokenForge-Pitch.pptx`](./pitch/TokenForge-Pitch.pptx).
