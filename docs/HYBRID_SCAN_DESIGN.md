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
| LLM is opt-in (`--mode hybrid`) | Honest pitch; no surprise external usage |
| Token math stays heuristic | `estTokens ≈ ceil(bytes / 4)` — not model guesses |
| `risk-core` stays pure | No HTTP, Ollama, vendor SDKs, or subprocesses in the kernel |
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
     walk + stat + scoreRisk           noop | ollama | codex | anthropic
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
The Findings view lists paths with source, reason, confidence, and truncated
detail; a detail drawer shows the explanation plus copy-only suggestion.
`kept` / `review` rows appear on the LLM (and Combined) board and are labeled
as not counted in saved tokens.

**Finding** (optional):

| Field | Type | Description |
| --- | --- | --- |
| `source` | `heuristic \| llm \| combined` | Provenance |
| `confidence` | 0–1 number | LLM confidence |
| `detail` | string | Human-readable LLM explanation |
| `suggestion` | `{ kind, summary }` | Copy-only advice. TokenForge **never applies** this |

`suggestion.kind` allowlist: `exclude_from_context`, `trim_instructions`, `dedupe_rules`, `add_ignore`, `review`. Unknown kinds are dropped at parse time. Code snippets (`suggestion.snippet`) are **deferred** — not in the v0 contract.

Heuristic findings get deterministic explanations and template suggestions in `risk-core` (`explainFinding`, `resolveSuggestion`) even when JSON omits `detail` / `suggestion`.

**New `reason` values** (LLM-only findings):

- `semantic_bloat`
- `redundant_instructions`
- `low_signal_config`

**Report** (optional):

```json
"scan": {
  "mode": "heuristic | hybrid",
  "llm": {
    "backend": "noop | ollama | codex | anthropic",
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
| `codex` | Local Codex CLI process | Reuses the user's saved ChatGPT login |
| `anthropic` | Anthropic Messages API | Org-approved cloud |

Registry: `cli/src/enrichers/registry.ts` — mirrors Fix adapter pattern.

### CLI flags (Phase 2)

```bash
tokenforge scan .                                    # heuristic (default)
tokenforge scan . --mode hybrid                      # hybrid + noop enricher
tokenforge scan . --mode hybrid --llm ollama:qwen2.5-coder:7b
tokenforge scan . --mode hybrid --llm codex --allow-external
tokenforge scan . --mode hybrid --llm codex:gpt-5.6-sol --allow-external
```

Environment (external backends):

- Codex uses the authentication saved by `codex login`; TokenForge does not read API keys.
- `ANTHROPIC_API_KEY` remains the existing configuration for the Anthropic adapter.
- `TOKENFORGE_LLM_ENDPOINT` remains an override for HTTP-based adapters.

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
      "detail": "Repeats lint rules already in AGENTS.md",
      "suggestion": {
        "kind": "dedupe_rules",
        "summary": "Keep unique bullets; drop the copy that already lives in AGENTS.md."
      }
    }
  ]
}
```

Adapters map `verdict: exclude` → `action: excluded` and attach bytes/tokens from candidates.
`suggestion` is copied onto the finding when `kind` is allowlisted; snippets and
unknown kinds are dropped. TokenForge does **not** apply suggestions — `apply`
still writes provider policy packs only.

Prompt rules forbid architecture, API, or product refactors.

## Privacy and cost

| Mode | Data leaves machine? | Cost |
| --- | --- | --- |
| `heuristic` | No | None |
| `hybrid` + `ollama` | No (local) | Local GPU/CPU only |
| `hybrid` + `codex` | Yes — candidate excerpts via Codex CLI | ChatGPT plan limits |
| `hybrid` + `anthropic` | Yes — candidate excerpts | Per-provider API usage |

UX/docs must state this before external enrichment runs. Do **not** auto-apply LLM
findings or suggestions; `apply` continues to use the merged report with existing
exclusion rules (policy pack only). The dashboard copies advice; it does not write
source files.

## Honesty (pitch)

- **Default scan does not use AI.**
- Hybrid adds an **optional semantic pass** on a bounded candidate set.
- We still do **not** intercept any agent’s private context pipeline.
- LLM suggestions are **recommendations** (kind + summary) on the Token Risk JSON.
  TokenForge does not apply them.

## Implementation map (board)

Epic: **[#60 F1 — Hybrid Detect backends](https://github.com/JordyNicholas/TokenForge/issues/60)**. Full board: [`BOARD.md`](./BOARD.md).

| Issue | Deliverable | Status |
| --- | --- | --- |
| #41 | This design + schema/types scaffolding (foundation) | Shipped |
| #42 | `risk-core`: candidate selection + merge (tests) | Shipped |
| #43 | CLI: enricher port + noop adapter + `--mode hybrid` wiring | Shipped |
| #44 | CLI: Ollama enricher (local Qwen) | Shipped |
| #47 | Dashboard: hybrid / LLM finding display | Shipped |
| #54 | Dashboard: finding details + heuristic explanations | Shipped |
| #55 | Advisory finding suggestions (copy-only, never applied) | Shipped |
| #49 | Pitch FAQ + deck: hybrid scan talking points | Shipped (deck roadmap refresh in #63) |
| #45 | CLI: Codex CLI enricher (re-scoped from direct OpenAI-compatible API) | Open — F1, parallel with #46 |
| #46 | CLI: Anthropic enricher | Open — F1, parallel with #45 |
| #48 | Extension: optional enricher on instruction paths | Open — F1 last, after #45 or #46 |

Remaining F1 order: **#45 ∥ #46 → #48**.

## Out of scope (this design)

- Using LLM output to replace byte-based `estTokens`
- Sending lockfiles or entire trees to models
- Gating CI on hybrid scan results (non-deterministic)
- Cloud-hosted TokenForge scan service
- Applying suggestions to source files
- `suggestion.snippet` / code patches (deferred until text advice is trusted)
- Architectural, API, or product-refactor advice
