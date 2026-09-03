# Hybrid Fix design — heuristic-routed LLM policy synthesis

**Status:** Locked — F7 (#225)  
**Scope:** Fix must reduce instruction bleed, not only exclusion lists and reminders.  
**Companion:** [`COMPLEMENTARY_HYBRID_SCAN.md`](./COMPLEMENTARY_HYBRID_SCAN.md) · [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) · [`HEURISTIC_FIX_DESIGN.md`](./HEURISTIC_FIX_DESIGN.md)

## Product rule

> **Heuristic decides where to look and what is safe by shape; LLM decides what is wasteful by meaning within that set; Fix compiles complete bleed-reduction policy within a configured budget.**

## Scan routing (Detect)

Hybrid enrichment uses a **heuristic attention set** — not a blind full-repo dump, not an arbitrary 30-file cap for vendor backends.

| Tier | Backends | Candidate scope |
| --- | --- | --- |
| **Local** | `noop`, `ollama` | Top-K from attention set (default K=30) |
| **Vendor** | `cursor-cli`, `codex`, `anthropic`, `claude-code`, `gemini-cli` | Full attention set (no count cap) |

Attention set = union of:

- Instruction / rules paths from the walk
- `instructionBudget.files`
- Paths with heuristic findings
- Borderline + repeated-config buckets (existing routing)

Implementation: `buildHeuristicAttentionSet()` in `packages/risk-core`.

## Apply modes (Fix)

| Mode | Default | Behaviour |
| --- | --- | --- |
| `heuristic` | yes | Deterministic `synthesizeLeanInstructions()` with complete summaries |
| `hybrid` | opt-in | LLM compiles scan JSON + instruction bodies → managed policy section |

Hybrid apply **consumes the scan report**; it does not re-enrich the repo.

### Policy byte budget

Configurable — not a fixed 2048-byte stub cap:

| Source | Precedence |
| --- | --- |
| `--policy-max-bytes` | highest |
| `.tokenforge/config.json` → `apply.policyMaxBytes` | |
| Mode default | heuristic 4 KiB, hybrid 8 KiB |

LLM output that exceeds budget falls back to heuristic synthesis — so the
deterministic pack's quality bounds the hybrid path's worst case. That path is
specified in [`HEURISTIC_FIX_DESIGN.md`](./HEURISTIC_FIX_DESIGN.md) (F14).

## CLI

```bash
# Scan — vendor tier uses full attention set
tokenforge scan . --mode hybrid --llm cursor-cli:composer-2.5 --allow-external

# Apply — hybrid policy synthesis
tokenforge apply . --mode hybrid --llm cursor-cli:composer-2.5 --allow-external

# Presentation backup
npm run tokenforge:presentation-full          # extension checklist + heuristic + hybrid
npm run tokenforge:presentation-heuristic     # Act 2 only (fixtures/hybrid-eval-app)
npm run tokenforge:presentation-hybrid        # Act 3 only
```

Runbook: [`../runbooks/PRESENTATION_HYBRID_EVAL.md`](../runbooks/PRESENTATION_HYBRID_EVAL.md).

## Safety (unchanged)

- No silent edits to user instruction files outside managed markers
- Same exclusion / advisory gates as F6
- `--allow-external` required for vendor backends

## Implementation map (#225)

| Issue | Deliverable |
| --- | --- |
| #226 | This document + BOARD F7 |
| #227 | `buildHeuristicAttentionSet` |
| #228 | Tiered enrichment in CLI scan |
| #229 | Configurable policy budget |
| #230 | `PolicySynthesizer` / cursor-cli apply path |
| #231 | `apply --mode hybrid` + config file |
| #232 | Tests |
| #233 | Doc refresh |
| #234 | `presentation-hybrid` script |
