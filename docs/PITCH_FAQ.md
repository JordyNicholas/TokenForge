# Pitch FAQ — TokenForge

Short answers for judges and collaborators. Aligns with [`CONCEPT_BRIEF.md`](./CONCEPT_BRIEF.md).

## vs Claude Auto Memory?

| Auto Memory | TokenForge |
| --- | --- |
| Remembers useful project knowledge | Stops **paying** for useless context |
| Enriches continuity for one agent | Cuts **billable** waste for the **enterprise** |
| Quality / continuity metric | **Tokens avoided / AI credits / $** |

**Sound bite:** *They help the agent remember. We help the organisation stop bleeding tokens.*

## Do you use AI to scan?

**Default: no.** `tokenforge scan` is heuristic — file size, path class, inactivity, and `estTokens ≈ ceil(bytes / 4)`.

**Optional Phase 2: hybrid mode** (`--mode hybrid`) runs the same baseline plus an LLM **enricher** on a bounded candidate set (instruction files, borderline configs, top-N paths). Backends are pluggable:

- **Local** — Ollama / Qwen 2.5-Coder (data stays on machine)
- **External** — OpenAI-compatible, Anthropic (org-approved keys; excerpts may leave the machine)

Token math stays heuristic; the model adds semantic findings and explanations, not primary token counts.

Full design: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md).

## Do you intercept the agent’s context pipeline?

**No.** We score open tabs and repo paths, recommend hygiene, and write exclusion/instruction policy files. We do not hook into any vendor’s private Chat/Agent pipeline.

## Where does the ~30% come from?

Scenario math on the dashboard assumptions panel (rate, team size, msgs/day, model mix) applied to demo scan totals — not a universal production SLA. See `fixtures/expected/noisy-app-totals.json` and `dashboard/public/demo-seed.json`.

## Completions vs Chat/Agent metering?

TokenForge targets **metered Chat/Agent / AI-credit** workflows where context size drives cost — not unlimited inline completions.

## Pitch deck

Regenerate: `python3 scripts/generate-pitch-deck.py` → [`pitch/TokenForge-Pitch.pptx`](./pitch/TokenForge-Pitch.pptx).
