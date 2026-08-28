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
4. **Repeated per-package configs** — `config`-class basenames appearing in 2+
   distinct directories (`repeatedConfigBasenames`), independent of the 4 KiB
   borderline floor. A per-package `tsconfig.json` is a few hundred bytes, so
   every size-keyed bucket misses it: redundancy is about how many copies
   exist, not how big each one is. Derived from the path list alone — no
   workspace manifest is read.

Credential-shaped paths (`isSecretPath`) are removed **before** any bucket
runs, so no selection rule can surface one.

Hard caps:

- `DEFAULT_MAX_ENRICHMENT_CANDIDATES` = 30 files per run —
  `risk-core/domain/constants.ts`, applied as the default inside
  `selectEnrichmentCandidates`. A caller that omits `maxCandidates` gets it by
  contract; `enrichers/limits.ts` re-exports it as `MAX_ENRICHMENT_CANDIDATES`.
  It is not a tuning knob: it bounds how much source leaves the machine on an
  external backend, what a hosted backend is billed for, and — on Ollama, where
  each batch of 2 has its own 900s timeout — whether a scan of a large monorepo
  terminates at all.
- `MAX_CANDIDATE_BYTES` = 32 KiB read per file (`enrichers/limits.ts`), applied
  at the read boundary before a backend is chosen. How much of it reaches the
  prompt is per-backend: local Ollama trims to `MAX_LLM_EXCERPT_CHARS`
  (2 KiB), and the hosted/CLI backends pass `LARGE_CONTEXT_PROMPT` and send
  the excerpt untrimmed.
- `DEFAULT_REPEATED_CONFIG_COUNT` = 8 paths from bucket 4 (B4: every bucket
  gets its own cap — `package.json` recurs in every package of a large
  monorepo). A group may be truncated but never cut below two members, since
  a lone copy has nothing to be compared against.

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
detail; a detail drawer shows the explanation plus suggestion (feeds policy-pack synthesis; not a source edit).
`kept` / `review` rows appear on the LLM (and Combined) board and are labeled
as not counted in saved tokens.

**Finding** (optional):

| Field | Type | Description |
| --- | --- | --- |
| `source` | `heuristic \| llm \| combined` | Provenance |
| `confidence` | 0–1 number | LLM confidence |
| `detail` | string | Human-readable LLM explanation |
| `suggestion` | `{ kind, summary }` | Advice for Prove UX **and** lean policy-pack synthesis. Never used to rewrite `AGENTS.md` / rules sources |


`suggestion.kind` allowlist: `exclude_from_context`, `trim_instructions`, `dedupe_rules`, `add_ignore`, `review`, `consolidate_duplicates`. Unknown kinds are dropped at parse time. `consolidate_duplicates` is vocabulary only for `duplicate_logic` (never applied by `apply`). Code snippets (`suggestion.snippet`) are **deferred**.

`redundant_config` reuses `dedupe_rules`, which is also in `HYGIENE_KINDS` —
the set deciding what `synthesizeLeanInstructions` writes into the provider
instruction file. `hygieneBullets` therefore skips the reason explicitly, at
reason level rather than kind level: build-config refactoring advice must not
land in the file the agent reads every turn, while `dedupe_rules` stays correct
for `redundant_instructions`.

Heuristic findings get deterministic explanations and template suggestions in `risk-core` (`explainFinding`, `resolveSuggestion`) even when JSON omits `detail` / `suggestion`.

**New `reason` values** (LLM-only findings):

- `semantic_bloat`
- `redundant_instructions` — overlapping agent instruction/rules files only
- `low_signal_config` — noise *within* one machine config dump, not duplication
  *across* files
- `duplicate_logic` — the source-code counterpart: 2+ source paths implementing
  the same behavior under different names. **Advisory only**: always
  `verdict: review` (coerced in `parseStructuredFindings` if a model returns
  `exclude`), because both copies are still imported and executed, so hiding one
  from agent context fixes nothing. Added in schema **v1**; see
  `docs/schemas/risk-event.v0.schema.json` for the frozen predecessor.
- `redundant_config` — the config counterpart: 2+ config paths under different
  packages carrying the same settings (e.g. a `tsconfig.json` copied per package
  instead of extending a shared base). **Advisory only** for the same reason,
  and coerced the same way: every package still loads its own copy at build
  time. Its `suggestion.kind` is pinned to `dedupe_rules` — no new suggestion
  kind was added, per #114's caution about vocabulary growth. Added in schema
  **v3**; see `docs/schemas/risk-event.v2.schema.json` for the frozen
  predecessor. Example: [`schemas/examples/scan-report.hybrid.monorepo-config.json`](./schemas/examples/scan-report.hybrid.monorepo-config.json).

`duplicate_logic` and `redundant_config` share one `ADVISORY_DUPLICATE_REASONS`
set in `structured.ts` rather than being special-cased twice: the rationale is
identical, only the mechanism of "still loaded" differs (imported at runtime vs
read by the build).

**Prompt guard.** A shared filename is not redundancy — packages legitimately
differ in dependencies, scripts, and compiler paths. The policy rules say so
explicitly, and `fixtures/monorepo-config-app` carries a `package.json` trio as
the standing false-positive control: routing selects it (routing is by name),
and keeping the model off it is the prompt's job, not the router's.

**Report** (optional):

```json
"scan": {
  "mode": "heuristic | hybrid",
  "llm": {
    "backend": "noop | ollama | codex | anthropic",
    "model": "qwen2.5-coder:7b",
    "endpoint": "http://localhost:11434",
    "durationMs": 842,
    "candidatesSent": 12,
    "analysisOverview": {
      "summary": "3–6 sentence capsule of enricher conclusions (optional).",
      "themes": ["lockfiles", "redundant instructions"],
      "caveats": ["optional quality notes"]
    }
  }
}
```

`analysisOverview` is optional Prove metadata (dashboard LLM board). Fix adapters ignore it and still use per-path findings.
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
| `anthropic` | Anthropic Messages API | Org-approved cloud; `ANTHROPIC_API_KEY` |
| `claude-code` | Local Claude Code CLI process | Reuses the user's saved subscription login |
| `gemini-cli` | Local Gemini CLI process | Reuses the user's saved Google login |
| `cursor-cli` | Local Cursor CLI (`agent`) process | Reuses Cursor login or `CURSOR_API_KEY` |

`anthropic` and `claude-code` reach the same models and differ only in **who
pays**: an API key billed per call, versus a Claude Pro/Max plan. That is the
same split `codex` provides against an OpenAI API key, which is why the two CLI
backends share a shape (spawn, strip the API key from the child environment,
bounded prompt on stdin, structured JSON out).

Registry: `cli/src/enrichers/registry.ts` — mirrors Fix adapter pattern.

### Single pass (hosted / CLI backends)

`anthropic`, `claude-code`, `codex`, `gemini-cli` and `cursor-cli` send the
**whole candidate set in one request** (`SINGLE_PASS_BATCH_SIZE`, derived from
the candidate cap). Chunking them was costing findings: a claim about two files
is unreachable when the chunker separates them, and measured against the real
CLI, batches of 4 missed a third `tsconfig.json` copy and one side of a
duplicate-function pair that a single pass found. See
[`E2E_CLAUDE_CODE_ENRICH_TEST.md`](../testing/E2E_CLAUDE_CODE_ENRICH_TEST.md).

The full 30-candidate prompt is ~17K tokens, so there is nothing to chunk
around on a model with a large context window.

### Multi-pass enrich (local-first)

Flat independent batches lose cross-file context (e.g. `redundant_instructions`
across `AGENTS.md` and a rules file). Ollama uses a **map → judge → reconcile**
pipeline in `cli/src/enrichers/multipass/` (#66). Transport stays backend-specific;
orchestration is shared via an injected `callModel`.

```text
Pass A (1 call)  → RepoContextMap { hubs, clusters, batchHints, suspects? }
Pass B (N calls) → judge batches (map-conditioned grouping; default size 2)
Pass C (1 call)  → reconcile findings (no file bodies) + deterministic safety net
```

| Rule | Behaviour |
| --- | --- |
| Context carry | Compact **map artifact** on later prompts — not full chat history |
| Pass A failure | Diagnose reason; one schema repair call; then flat Pass B + skip Pass C LLM |
| Pass C failure | Keep Pass B findings; still run deterministic reconcile |
| Grouping | Prefer `batchHints` / `clusters` together, then leftovers by size |
| Safety net | Dedupe by path; downgrade unsupported `redundant_instructions` |

Pass A digests instruction/rules paths, `source` files, and configs whose
basename repeats within that same inventory (short excerpts) — a config earns a
digest only when a sibling copy is present to compare it against. Token math and
report merge semantics are unchanged. Anthropic/OpenAI may adopt the same
orchestrator later; MVP wires **Ollama first**.

Judge / reconcile prompts share `ENRICHMENT_POLICY_RULES`: cut lockfiles and
generated noise, but **keep** README / RULEBOOK / ADRs / ENV / OpenAPI-style
docs (prefer `review` + trim over exclude). When unsure, keep — never exclude.

### CLI flags (Phase 2)

```bash
tokenforge scan .                                    # heuristic (default)
tokenforge scan . --mode hybrid                      # hybrid + noop enricher
tokenforge scan . --mode hybrid --llm ollama:qwen2.5-coder:7b
tokenforge scan . --mode hybrid --llm codex --allow-external
tokenforge scan . --mode hybrid --llm codex:gpt-5.6-sol --allow-external
tokenforge scan . --mode hybrid --llm claude-code --allow-external
tokenforge scan . --mode hybrid --llm claude-code:claude-opus-5 --allow-external
tokenforge scan . --mode hybrid --llm gemini-cli --allow-external
tokenforge scan . --mode hybrid --llm gemini-cli:gemini-2.5-flash --allow-external
tokenforge scan . --mode hybrid --llm cursor-cli --allow-external
tokenforge scan . --mode hybrid --llm cursor-cli:composer-2.5 --allow-external
```

Environment (external backends):

- Codex uses the authentication saved by `codex login`; TokenForge does not read API keys.
- Claude Code uses the login saved by `claude` / `/login`; TokenForge does not read API keys.
- Gemini CLI uses the Google login saved by `gemini`; TokenForge strips `GEMINI_API_KEY` / `GOOGLE_API_KEY` from the child environment.
- Cursor CLI uses `agent login` or `CURSOR_API_KEY`; excerpts bill against the Cursor account.
- `ANTHROPIC_API_KEY` remains the existing configuration for the Anthropic adapter.
- `TOKENFORGE_LLM_ENDPOINT` remains an override for HTTP-based adapters.

### Trust boundary for CLI backends

Both CLI backends run in a fresh empty temporary directory, never the scanned
repository. For Codex that is defence in depth on top of `--sandbox read-only`.
For Claude Code it is the **primary** control: a `claude -p` session loads
settings, hooks, MCP servers, and `CLAUDE.md` from its working directory with no
trust dialog, so pointing it at the repository under analysis would let that
repository configure the process analyzing it.

The CLI's own `--bare` flag would also suppress that discovery, but it never
reads OAuth credentials — it requires `ANTHROPIC_API_KEY`, which is exactly the
thing this backend exists to avoid. The empty working directory buys back most
of what `--bare` gives up, without giving up the login.

The tool surface is deny-by-default (`--permission-mode dontAsk`,
`--strict-mcp-config`) — deliberately **not**
`--dangerously-skip-permissions`, which is `bypassPermissions` and would
auto-approve every tool. The candidate excerpts are already in the prompt, so
the pass needs no file access at all.

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
unknown kinds are dropped. TokenForge does **not** rewrite repo instruction
sources from suggestions. `apply` writes the provider policy pack: exclusions
from `action: excluded`, and a **synthesized** lean `*-instructions.md` from
the combined report (`synthesizeLeanInstructions` in `risk-core`) — heuristic
excludes, hygiene summaries, and optional hybrid `analysisOverview` themes.

Prompt rules forbid architecture, API, or product refactors.

## Privacy and cost

| Mode | Data leaves machine? | Cost |
| --- | --- | --- |
| `heuristic` | No | None |
| `hybrid` + `ollama` | No (local) | Local GPU/CPU only |
| `hybrid` + `codex` | Yes — candidate excerpts via Codex CLI | ChatGPT plan limits |
| `hybrid` + `anthropic` | Yes — candidate excerpts | Per-provider API usage |
| `hybrid` + `claude-code` | Yes — candidate excerpts via Claude Code CLI | Claude plan limits |
| `hybrid` + `gemini-cli` | Yes — candidate excerpts via Gemini CLI | Google/Gemini plan limits |
| `hybrid` + `cursor-cli` | Yes — candidate excerpts via Cursor CLI | Cursor plan / API usage |

UX/docs must state this before external enrichment runs. Do **not** auto-edit
`AGENTS.md` / vendor rules from LLM suggestions. `apply` synthesizes the
provider policy pack from the **combined** merged report (exclusions + lean
instructions). The dashboard still surfaces suggestion text for managers; it
does not write source files.

## Honesty (pitch)

- **Default scan does not use AI.**
- Hybrid adds an **optional semantic pass** on a bounded candidate set.
- We still do **not** intercept any agent’s private context pipeline.
- LLM suggestions are **recommendations** on the Token Risk JSON. They feed the
  **policy-pack instructions** synthesizer; they are **not** patched into
  `AGENTS.md` / `.cursor/rules`.
- TokenForge does **not** meter vendor Chat/Agent “reasoning vs writing” tokens;
  Detect/Fix act on **context waste** (paths + instruction bloat), not live
  billing breakdowns.

## Implementation map (board)

Epic: **[#60 F1 — Hybrid Detect backends](https://github.com/JordyNicholas/TokenForge/issues/60)**. Full board: [`BOARD.md`](../delivery/BOARD.md).

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
| #45 | CLI: Codex CLI enricher (re-scoped from direct OpenAI-compatible API) | Shipped |
| #46 | CLI: Anthropic enricher | Shipped |
| #66 | CLI: multi-pass local-first enrich (map → judge → reconcile) | Shipped |
| #48 | Extension: optional enricher on instruction paths | Shipped — F1 complete |

F1 (#60) complete: CLI hybrid backends + extension opt-in instruction enrich.

### F1.1 — Claude Code CLI backend (epic #145)

| Issue | Deliverable | Status |
| --- | --- | --- |
| #146 | `risk-core`: `claude-code` backend id + schema v5 | Shipped |
| #147 | `enrichers`: `claude-code` adapter + spec/registry wiring | This section |
| #148 | CLI: `--llm claude-code` flags + manual E2E against the real binary | Shipped — [`E2E_CLAUDE_CODE_ENRICH_TEST.md`](../testing/E2E_CLAUDE_CODE_ENRICH_TEST.md) |
| #149 | Extension: treat `claude-code` as an external backend | Open |

## Out of scope (this design)

- Using LLM output to replace byte-based `estTokens`
- Sending lockfiles or entire trees to models
- Gating CI on hybrid scan results (non-deterministic)
- Cloud-hosted TokenForge scan service
- Applying suggestions to source files
- `suggestion.snippet` / code patches (deferred until text advice is trusted)
- Architectural, API, or product-refactor advice
