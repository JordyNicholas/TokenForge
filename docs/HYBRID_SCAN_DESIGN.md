# Hybrid scan design — heuristics + optional LLM enricher

Locked initial design for Phase 2 **Detect** enrichment. MVP stays **heuristic-only**;
this document defines the contract and scaffolding so implementation can land in
small PRs mapped to board issues.

Related: [`SOLUTION_DESIGN.md`](./SOLUTION_DESIGN.md#architecture),
[`schemas/risk-event.schema.json`](./schemas/risk-event.schema.json).

## Problem

Heuristic scan (path class, byte size, tab inactivity) is fast, deterministic, and
offline — but it cannot judge **semantic** waste: redundant agent instructions,
contradictory rules, or low-signal config that looks “important” by filename alone.

Optional **LLM enrichment** closes that gap without making AI the default scan path.

## Principles

| Rule | Rationale |
| --- | --- |
| Heuristics are always the baseline | Speed, CI pinning, zero GPU, works offline |
| LLM is opt-in (`--mode hybrid`) | Honest pitch; no surprise API cost |
| Token math stays heuristic | `estTokens ≈ ceil(bytes / 4)` — not model guesses |
| `risk-core` stays pure | No HTTP, Ollama, or vendor SDKs in the kernel |
| Enrichers live in CLI (like Fix adapters) | Pluggable local **and** external backends |
| Bounded candidate set | Never send whole lockfiles / `node_modules` trees |
| External mode is explicit | Candidate excerpts may leave the machine |

## Architecture

```text
                    ┌─────────────────────┐
                    │  packages/risk-core │  kernel
                    │  classify + score   │
                    │  candidates + merge │
                    └──────────┬──────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
     HeuristicScanner (CLI/ext)      LlmEnricher port (CLI only)
     walk + stat + scoreRisk           noop | ollama | openai | anthropic
              │                                 │
              └──────── merge findings ─────────┘
                               │
                               ▼
                    .tokenforge/scan-report.json
```

**Fix adapters** and **LLM enrichers** are separate port families:

- Fix: findings → vendor policy files (`copilot`, `cursor`, …)
- Enricher: candidate excerpts → additional / enriched findings

## Scan modes

| Mode | CLI flag | Behaviour |
| --- | --- | --- |
| `heuristic` | default | Today’s scan — walk tree, score, report |
| `hybrid` | `--mode hybrid` | Heuristic scan + optional LLM pass on candidates |

Hybrid without a configured backend uses the **noop** enricher (empty LLM findings,
`scan.llm.backend: "noop"`) so orchestration and merge can be tested without a model.

## Candidate selection

Implemented in `packages/risk-core` (`selectEnrichmentCandidates`). A path is a
candidate when **any** of:

1. **Instruction / rules paths** — basename or segment match, e.g. `AGENTS.md`,
   `.github/copilot-instructions.md`, `.cursor/rules/**`, `CLAUDE.md`
2. **Borderline heuristic** — scored but not `atRisk`, file class `config` or
   `unknown`, bytes ≥ 4 KiB
3. **Top-N largest** — among non-`lockfile` / non-`generated` assessments (default N = 10)

Hard caps (CLI `enrichers/limits.ts`):

- `MAX_ENRICHMENT_CANDIDATES` = 30 files per run
- `MAX_CANDIDATE_BYTES` = 32 KiB read per file (excerpt for the model)

## Merge semantics

`mergeFindings(heuristic, llm)` in `risk-core`:

1. Index by `path`
2. Heuristic finding seeds the row (`source: heuristic`)
3. LLM finding on same path → `source: combined`; keep heuristic `reason` and
   token fields; attach LLM `detail` / `confidence`
4. LLM-only path → `source: llm`; must include `bytes` / `estTokens` from candidate metadata
5. Sort by `estTokens` desc, then path asc

**Totals** (`beforeTokens`, `afterTokens`, `savedTokens`) are computed from the
**heuristic assessment set only** in v0.1 — LLM findings do not rewrite tree totals
until we define a safe exclusion rule for semantic-only paths (Future).

## JSON contract extensions (backward-compatible v0)

Optional fields — existing v0 reports remain valid. Top-level `findings` / `totals`
mirror the **combined** layer (Fix adapters keep using them).

### Separated layers (`layers`)

When the CLI writes a scan report, it includes:

```json
"layers": {
  "heuristic": { "findings": [...], "totals": {...} },
  "llm": { "findings": [...], "totals": {...} },
  "combined": { "findings": [...], "totals": {...} }
}
```

| Layer | Contents |
| --- | --- |
| `heuristic` | Path class, size, inactivity only |
| `llm` | Semantic enricher findings + candidate-scope totals |
| `combined` | `mergeFindings(heuristic, llm)` — same as top-level `findings` |

The dashboard exposes three **boards** (Combined / Heuristic / LLM) that read
from `layers` when present, or synthesize from legacy `findings` + `source`.

**Finding** (optional):

| Field | Type | Description |
| --- | --- | --- |
| `source` | `heuristic \| llm \| combined` | Provenance |
| `confidence` | 0–1 number | LLM confidence |
| `detail` | string | Human-readable LLM explanation |

**New `reason` values** (LLM-only findings):

- `semantic_bloat`
- `redundant_instructions`
- `low_signal_config`

**Report** (optional):

```json
"scan": {
  "mode": "heuristic | hybrid",
  "llm": {
    "backend": "noop | ollama | openai | anthropic",
    "model": "qwen2.5-coder:7b",
    "endpoint": "http://localhost:11434",
    "durationMs": 842,
    "candidatesSent": 12
  }
}
```

Example: [`schemas/examples/scan-report.hybrid.v0.json`](./schemas/examples/scan-report.hybrid.v0.json).

## LLM enricher port (CLI)

```typescript
type LlmEnricher = {
  id: LlmBackendId;
  enrich(input: LlmEnricherInput): Promise<LlmEnrichmentResult>;
};
```

| Backend id | Target | Notes |
| --- | --- | --- |
| `noop` | — | Default; no network |
| `ollama` | Local Ollama | Qwen 2.5-Coder, etc. |
| `openai` | OpenAI-compatible | OpenAI, Azure, Groq, LM Studio, vLLM |
| `anthropic` | Anthropic Messages API | Org-approved cloud |

Registry: `cli/src/enrichers/registry.ts` — mirrors Fix adapter pattern.

### CLI flags (Phase 2)

```bash
tokenforge scan .                                    # heuristic (default)
tokenforge scan . --mode hybrid                      # hybrid + noop enricher
tokenforge scan . --mode hybrid --llm ollama:qwen2.5-coder:7b
tokenforge scan . --mode hybrid --llm openai:gpt-4o-mini --llm-endpoint https://api.openai.com/v1
```

Environment (external backends):

- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`
- `TOKENFORGE_LLM_ENDPOINT` (override default endpoint)

### Structured LLM output

Enrichers request JSON matching an internal schema (not yet in the public report schema):

```json
{
  "findings": [
    {
      "path": ".cursor/rules/testing.mdc",
      "verdict": "exclude",
      "reason": "redundant_instructions",
      "confidence": 0.87,
      "detail": "Repeats lint rules already in AGENTS.md"
    }
  ]
}
```

Adapters map `verdict: exclude` → `action: excluded` and attach bytes/tokens from candidates.

## Privacy and cost

| Mode | Data leaves machine? | Cost |
| --- | --- | --- |
| `heuristic` | No | None |
| `hybrid` + `ollama` | No (local) | Local GPU/CPU only |
| `hybrid` + `openai` / `anthropic` | Yes — candidate excerpts | Per-provider API usage |

UX/docs must state this before external enrichment runs. Do **not** auto-apply LLM
findings; `apply` continues to use the merged report with existing exclusion rules.

## Honesty (pitch)

- **Default scan does not use AI.**
- Hybrid adds an **optional semantic pass** on a bounded candidate set.
- We still do **not** intercept any agent’s private context pipeline.
- LLM suggestions are **recommendations** merged into the same Token Risk JSON.

## Implementation map (board)

| Issue | Deliverable |
| --- | --- |
| #41 | This design + schema/types scaffolding (foundation) |
| #42 | `risk-core`: candidate selection + merge (tests) |
| #43 | CLI: enricher port + noop adapter + `--mode hybrid` wiring |
| #44 | CLI: Ollama enricher (local Qwen) |
| #45 | CLI: OpenAI-compatible enricher |
| #46 | CLI: Anthropic enricher |
| #47 | Dashboard: hybrid / LLM finding display |
| #48 | Extension: optional enricher on instruction paths (Future) |
| #49 | Pitch FAQ + deck: hybrid scan talking points |

Build order: #41 → #42 → #43 → (#44 \| #45 \| #46 in parallel) → #47 → #48.

## Out of scope (this design)

- Using LLM output to replace byte-based `estTokens`
- Sending lockfiles or entire trees to models
- Gating CI on hybrid scan results (non-deterministic)
- Cloud-hosted TokenForge scan service
