# instructions-app (TokenForge demo fixture)

Synthetic Node app used to drive the **hybrid / LLM scan** demo. It is not an
npm workspace and not a product package.

Neither `fixtures/noisy-app` nor `fixtures/borderline-app` has any AI agent
instruction files, so nothing exercises the `semantic_bloat` /
`redundant_instructions` LLM-only reasons or checks that instruction files get
prioritized for enrichment. This fixture adds four verbose, duplicated
instruction files sized to sit in the "borderline" band: big enough to be
worth enriching, small enough not to trip the plain heuristic `oversized` rule
by themselves.

## What's in here

| Path | ~Bytes | Notes |
| --- | ---: | --- |
| `AGENTS.md` | ~6.4 KB | Repeats the same "always do X" paragraph many times. |
| `CLAUDE.md` | ~6.9 KB | Same pattern, different title. |
| `.cursorrules` | ~6.0 KB | Same pattern. |
| `.github/copilot-instructions.md` | ~7.1 KB | Same pattern. |
| `src/index.js` | <1 KB | Tiny real source; control. |

All four instruction files sit below `OVERSIZED_BYTES` (100 KB) and above
`MIN_BORDERLINE_BYTES` (4 KB), so on their own they never flip `atRisk` in the
heuristic layer — see `fixtures/expected/instructions-app-totals.json`, which
only pins the heuristic layer (near-zero savings, same shape as
`fixtures/lean-app`).

## What this proves

1. **Heuristic-only** (`--mode heuristic`, default): none of the instruction
   files are findings — this is expected and pinned.
2. **Candidate selection**: `selectEnrichmentCandidates`
   (`packages/risk-core/src/candidates/candidates.ts`) must put all four
   instruction files first, via `isInstructionPath` basename matching
   (`agents.md`, `claude.md`, `cursorrules`/`.cursorrules`,
   `copilot-instructions.md`).
3. **Hybrid mode** (`--mode hybrid`): with a real LLM backend, this is the
   fixture to point at manually to check `semantic_bloat` /
   `redundant_instructions` findings — see
   `docs/testing/E2E_HYBRID_SCAN_TEST.md`. Not automated here because LLM output is
   non-deterministic.

## Layout

```text
fixtures/instructions-app/
├── package.json
├── AGENTS.md
├── CLAUDE.md
├── .cursorrules
├── .github/copilot-instructions.md
└── src/index.js       # tiny keep-set
```
