# Pitch FAQ — TokenForge

Short answers for judges and collaborators. Aligns with [`CONCEPT_BRIEF.md`](./CONCEPT_BRIEF.md).
See [`DEMO_RUNBOOK.md`](../runbooks/DEMO_RUNBOOK.md) for the ≤5-min live demo script.

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

**Baseline: heuristic.** `tokenforge scan` always runs deterministic rules — file size, path class, inactivity, and `estTokens ≈ ceil(bytes / 4)`. That baseline is what Fix adapters and savings totals trust.

**Hybrid mode is complementary, not a replacement** (`--mode hybrid`). The same heuristic walk runs first; an optional LLM **enricher** then reviews a **bounded candidate set** (instruction files, borderline configs, top-N paths) and adds semantic findings, hygiene suggestions, and an `analysisOverview` capsule. Heuristic and LLM layers stay separate in the report (`scan.hybridDelta`); merge rules keep heuristic token fields authoritative on path collisions.

When hybrid runs, it should add **distinct** value — overview themes, advisory rows, or LLM-exclusive excludes — without undoing heuristic savings on fixtures like `noisy-app`. Default scan remains heuristic-only; hybrid is opt-in per run.

Backends are pluggable:

- **Local** — Ollama multipass (data stays on machine)
- **External** — Claude Code, Cursor CLI, Anthropic, Gemini CLI send bounded candidate excerpts (`--allow-external` required). **Codex** stages a sanitized eligible repo copy for one read-only audit (not per-file excerpts); optional `contextIndexRecommendations` and `repoAuditCoverage` appear on `scan.llm`.

Token math stays heuristic; models add semantic findings and explanations, not primary token counts. We do **not** intercept any vendor’s private context pipeline.

Full design: [`COMPLEMENTARY_HYBRID_SCAN.md`](../design/COMPLEMENTARY_HYBRID_SCAN.md) (F6) and [`HYBRID_SCAN_DESIGN.md`](../design/HYBRID_SCAN_DESIGN.md).

## Do you intercept the agent’s context pipeline?

**No.** We score open tabs and repo paths, recommend hygiene, and write exclusion/instruction policy files. We do not hook into any vendor’s private Chat/Agent pipeline.

## Where does the ~30% come from?

Scenario math on the dashboard assumptions panel (rate, team size, msgs/day, model mix) applied to demo scan totals — not a universal production SLA. See `fixtures/expected/noisy-app-totals.json` and `dashboard/public/demo-seed.json`.

Demo seed also includes **imported usage** credits/$ — file/demo import plus optional
live sync via CLI adapters — not a claim that we meter the agent’s private pipeline.

## Who runs the monthly scan / bill pull?

**Platform — not individual developers.** Use the turnkey GitHub Action
(`.github/workflows/prove-monthly.yml`) or an equivalent cron calling
`tokenforge usage-sync` (+ optional heuristic `tokenforge scan`). Artifacts land
under `.tokenforge/` for Prove; the extension stays real-time Context Guard only.
Guide: [`prove-monthly.md`](../runbooks/prove-monthly.md). Sound bite:
*pipelines remember; humans don’t.*

## Does apply overwrite our CLAUDE.md / copilot-instructions.md?

**It does not wipe them.** `tokenforge apply` writes into each provider’s
**conventional** instruction file (e.g. `.github/copilot-instructions.md`,
`CLAUDE.md`, `.cursor/rules/tokenforge.mdc`):

- **Missing file** → create it with a TokenForge-managed section.
- **Existing file** → keep your text; insert or update only the block between
  `<!-- tokenforge:begin -->` and `<!-- tokenforge:end -->` (HTML comments so
  developers can see what TokenForge produced; agents treat them as non-content).

Exclusion candidate YAML stays on TokenForge-named paths and may fully replace.
Dry-run / apply output lists `create`, `merge`, or `replace` per path.

The lean section is **synthesized from that repo's scan, not a template**: the
opening line names the waste kinds actually found, “do not load” entries are
grouped by kind (binary assets, lockfiles and data dumps, build output, and
large text worth reading a section of), and Prefer names the repo's real source
roots. Exclusion globs never widen to a directory still holding source, config,
or an API contract. No token counts are written into the file — the numbers stay
in `scan-report.json`. See
[`HEURISTIC_FIX_DESIGN.md`](../design/HEURISTIC_FIX_DESIGN.md).

## Estimate vs actual billed usage?

**Wave A (shipped):** Prove projects $ from scan totals × Assumptions, imports a FinOps
CSV/JSON as billed usage, and compares **baseline vs after-period** (estimated
reduction, actual billed change, variance) with Assumptions frozen on that run. Demo
fixtures: `dashboard/public/sample-usage.csv` and `sample-usage-after.csv`. Repeatable
path: [`PILOT_RUNBOOK.md`](../runbooks/PILOT_RUNBOOK.md).

**Wave B (shipped):** `UsageProvider` port + Copilot / Cursor / Claude adapters,
`usage-pull` / `usage-sync`, and a BU/team **variance board** with period picker.
File/demo import remains the fallback.

**Wave C (shipped):** apply/org-pack **change markers**, Fix-on vs control **cohort**
compare, auto-suggest `realizedWasteShare` from variance, and this FAQ + Overview
**pilot KPI card**. Plan: [`USAGE_RECONCILIATION_PLAN.md`](../design/USAGE_RECONCILIATION_PLAN.md).

**Honesty:** we reconcile **estimated** context-waste savings with **period billed usage**.
We do not meter the agent’s private pipeline. Cohort tags reduce “was that TokenForge?”
noise — they do **not** prove 100% of an invoice delta was caused by TokenForge.
Live sync still needs org-approved credentials; import works offline.

## Completions vs Chat/Agent metering?

TokenForge targets **metered Chat/Agent / AI-credit** workflows where context size drives cost — not unlimited inline completions.

## Per-team vs global Prove?

Dashboard **Global** rolls up the business unit. Sidebar **Scope** opens one team/repo. Architecture tags (microservices, serverless, data-platform) show waste across estate styles. Assumptions stay BU-global.

## Pitch deck

Regenerate: `python3 scripts/generate-pitch-deck.py` → [`pitch/TokenForge-Pitch.pptx`](./pitch/TokenForge-Pitch.pptx).
