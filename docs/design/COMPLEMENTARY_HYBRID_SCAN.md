# Complementary hybrid scan — AI-first Detect design

**Status:** Locked (F6 epic #199)  
**Scope:** How heuristic and LLM layers complement each other in every scan; policy
safety invariants; enrichment tiers; acceptance criteria.  
**Audience:** Implementers, reviewers, pitch.  
**Companion:** [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) · [`HEURISTICS_AUDIT.md`](./HEURISTICS_AUDIT.md) · Epic [#199](https://github.com/JordyNicholas/TokenForge/issues/199)

---

## Product rule (non-negotiable)

> **Heuristic decides what is safe to exclude by shape and size; LLM decides what is
> wasteful by meaning and overlap; Fix applies only levers that change agent context
> without changing repository behaviour.**

Policy must **never** suggest actions with potential to break repository code:

- No edits to **application source** from scan or LLM suggestions
- No rewriting **user instruction/rules prose** from LLM `suggestion` fields (advice stays in the report / dashboard)
- No excluding load-bearing build configs, API contracts, or necessary generated clients
- No excluding one side of still-imported duplicate logic or still-loaded redundant config
- No excluding paths open in the active editor session (`activePaths`)

### Detect vs Fix — what gets edited

These are **different surfaces**. Do not conflate “scan never patches your docs” with “apply never touches provider files.”

| Surface | What happens |
| --- | --- |
| **Detect** (scan / hybrid) | Findings and suggestions land in `.tokenforge/scan-report.json`. TokenForge **does not** apply LLM output as edits to `AGENTS.md`, arbitrary `.cursor/rules/*.mdc`, or source files. |
| **Fix** (`tokenforge apply`) | Writes a **synthesized policy pack** via the selected provider adapter. That **may** update provider-facing files — but only through bounded, TokenForge-controlled write modes (see below). |

**Fix write modes** (#130):

1. **TokenForge-owned paths** — full overwrite is OK (exclusion YAML, dedicated rule files).
2. **Conventional instruction paths** — `merge-section` only: insert or update content between `<!-- tokenforge:begin -->` and `<!-- tokenforge:end -->`. User text **outside** those markers is preserved; TokenForge never silent full-file replaces an existing instruction file.

| Provider | Instruction target | Exclusion / sidecar |
| --- | --- | --- |
| `copilot` | `.github/copilot-instructions.md` (managed section) | `.github/tokenforge-copilot-exclusion-candidates.yml` |
| `claude` | `CLAUDE.md` (managed section) | `.claude/tokenforge-exclusion-candidates.yml` |
| `cursor` | `.cursor/rules/tokenforge.mdc` (dedicated file; does not edit your other rules) | `.cursor/tokenforge-exclusion-candidates.yml` |
| `generic` | `.github/tokenforge-instructions.md` | `.github/tokenforge-exclusions.yml` |

Implementation: `cli/src/commands/apply/apply.ts`, `cli/src/adapters/section-merge.ts`.

---

## Why complementary (not redundant)

TokenForge is **AI-powered and AI-first**: hybrid scan must add **distinct analysis**
on top of heuristic Detect in **every** scenario.

| Repo shape | Heuristic owns | LLM must add (complementary) |
| --- | --- | --- |
| Lockfile-heavy | Exclusion savings (class + size) | Instruction stack audit, `analysisOverview`, ignore-gap discover |
| Instruction bloat | Baseline keep-set | `semantic_bloat`, `redundant_instructions`, hygiene bullets |
| Monorepo configs | Repeated-config routing | `redundant_config` (advisory), cross-package detail |
| Duplicate helpers | Source candidate visibility | `duplicate_logic` (advisory), consolidation guidance |

If hybrid runs with `candidatesSent > 0` and produces **neither** LLM findings **nor**
an explicit clean-bill `analysisOverview`, the scan failed the complementarity contract.

---

## Division of labor

### Tier 0 — Heuristic (always, default)

**Owns:** path classification, byte size, output-shape classes, protection suppressions,
credential name gates, deterministic `atRisk` rules, token estimate (`bytes/4`),
CI-pinnable baseline totals, extension tab inactivity.

**Never owns:** semantic instruction quality, cross-file redundancy judgment,
“is this doc load-bearing?” beyond filename patterns.

Entry: `tokenforge scan` (default), extension tab scoring.

### Tier 1 — Local constrained (Ollama)

**Owns:** same semantic questions as Tier 2, via **multi-pass** orchestration
(map → judge → reconcile), 2 KiB excerpt trim, batch size 2 — tuned for offline 7B
models on modest hardware.

**Adds:** `analysisOverview`, cross-file batch hints, reconcile safety net.

Entry: `--mode hybrid --llm ollama:…`

### Tier 2 — External capable (Codex, Claude Code, Cursor CLI, Anthropic API, Gemini CLI)

**Owns:** same semantic scope as Tier 1; **must not** be a thinner code path.

- Single large-context pass (all candidates, up to 30) — not chunked batching
- Full read-boundary excerpts (32 KiB per file)
- **Mandatory** `analysisOverview` on every successful enrich (#206)
- Same `ENRICHMENT_POLICY_RULES` and safety parser as Tier 1

Transport differs (JSON schema vs prose parse); **analysis scope does not**.

Related extension: [#189](https://github.com/JordyNicholas/TokenForge/issues/189) —
**Codex full-repo context-index audit** (shipped on `codex` backend only):

- Stages a sanitized eligible copy (hard-skip `.git` / `node_modules` / `.tokenforge`; secret path + content gates).
- One `codex exec` read-only audit with heuristic findings as context (not constraints).
- Returns candidate-path findings plus optional `contextIndexRecommendations` (`.md` indexes) and `repoAuditCoverage` on `scan.llm`.
- Other Tier-2 backends keep single-pass excerpt enrichment unchanged.

---

## Policy safety invariants

Enforced in `risk-core` and at enricher parse boundaries — **not** prompt trust alone.

| Invariant | Enforcement |
| --- | --- |
| Protected paths never `action: excluded` | `protectionFor()` suppresses reasons; safety gate on LLM `exclude` |
| `duplicate_logic` / `redundant_config` never `exclude` | `parseStructuredFindings` coerces to `review` → `kept` |
| Application `source` not excluded for size alone | Heuristic B2: `oversized`-only source → `kept` (#202) |
| LLM `exclude` on `source` only via instruction allowlist + semantic reason | Safety gate (#201) |
| `activePaths` never in exclusion YAML or “Do not load” | `activePathSet()` in apply + synthesis |
| Advisory findings never in exclusion YAML | `proposedExclusionPaths` filters `action: excluded` only |
| `redundant_config` never in synthesized instruction hygiene | `synthesizeLeanInstructions` skips at reason level |
| Policy file ≤ 2048 bytes | `assertLeanInstruction()` |

### Instruction allowlist (LLM exclude on non-heuristic paths)

A path may receive LLM-driven `exclude` only when **all** hold:

1. `isInstructionPath(path)` **or** basename is a known rules file (e.g. `.mdc`)
2. Reason ∈ `{ semantic_bloat, redundant_instructions, low_signal_config }`
3. Not protected, not active, not advisory duplicate reason

---

## Merge and totals (unchanged baseline)

- `mergeFindings`: heuristic `reason` and token fields win on path collision
- Combined totals: full repo walk minus paths with `action: excluded|filtered` in merged findings
- LLM-only semantic excludes on paths heuristic kept **do** affect combined totals

New in #205: explicit `scan.hybridDelta` and `instructionBudget` metrics for Prove.

---

## Fix output (safe levers only)

| Output | Source | Safe because |
| --- | --- | --- |
| Exclusion YAML candidates | Heuristic + gated LLM excludes | Context-only; human merges into provider org/repo settings |
| Lean instructions markdown | `synthesizeLeanInstructions` → adapter | **Managed section merge** into conventional paths (Copilot, Claude) or **dedicated file** (Cursor `tokenforge.mdc`); synthesized body only — not a patch derived from LLM `suggestion` text applied to user rules |
| Ignore candidates (`.cursorignore`, etc.) | #207 | Human review; header says do not auto-merge |
| Review / advisory section | #208 | Copy-only in policy text; no exclude verbs for source/duplicates |
| Dashboard suggestions | All layers | Never applied by `apply` |

---

## Complementarity acceptance (fixtures)

| Fixture | Heuristic | Hybrid must |
| --- | --- | --- |
| `noisy-app` | High savings | LLM layer or overview present; heuristic savings unchanged |
| `instructions-app` | Zero instruction findings | LLM findings and/or combined delta; policy hygiene |
| `heuristic-edge-app` | Protected paths scored | Zero unsafe exclusions after gate |
| `semantic-duplicates-app` | Source in candidates | `duplicate_logic` advisory in LLM layer |
| `monorepo-config-app` | Repeated configs routed | `redundant_config` or cross-path review detail |

Automated: scripted enricher in `scan.hybrid.test.ts` (#209). Manual: provider E2E runbooks.

---

## F6 implementation map

Epic: **[#199 F6 — AI-first complementary hybrid Detect](https://github.com/JordyNicholas/TokenForge/issues/199)**

| Issue | Deliverable |
| --- | --- |
| #200 | This document + cross-refs |
| #201 | `risk-core` policy safety gate for LLM excludes |
| #202 | B2 — class-aware `excluded` for oversized source |
| #203 | CLI walk `.cursor/rules` (remove blanket `.cursor` skip) |
| #204 | Deterministic instruction bloat (repetition + stack budget) |
| #205 | JSON `hybridDelta` + `instructionBudget` (`alwaysOnTokens`) — v5 schema superset |
| #206 | Mandatory `analysisOverview` for Tier-2 backends |
| #207 | Cursor `.cursorignore` candidates |
| #208 | Policy advisory section + richer hygiene |
| #209 | Complementarity acceptance tests |
| #210 | Dashboard hybrid delta + instruction stack |
| #211 | Pitch FAQ + BOARD index |

Build order: **#200 → #201 → #202 → #203 → #204 → #205 → #206 → #207 → #208 → #209 → #210 → #211**

---

## Out of scope

- Intercepting vendor private context pipelines
- Applying LLM `suggestion` fields as direct edits to user-owned `AGENTS.md`, `.cursor/rules/*` (other than TokenForge-owned paths above), or application source
- Architecture/API/product refactors in applied policy
- Gating CI on live LLM output (non-deterministic)
- Replacing byte-based `estTokens` with model token counts
