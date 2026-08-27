# semantic-duplicates-app (TokenForge demo fixture)

Synthetic Node app used to stress-test **semantic** redundancy detection in
the hybrid / LLM scan, as opposed to literal/verbatim redundancy.

`fixtures/instructions-app` already proves candidate *routing* for
`AGENTS.md`/`CLAUDE.md`/`.cursorrules`/`copilot-instructions.md`, but its
duplication is a single paragraph copy-pasted a dozen times — a byte-hash or
plain string match could "catch" that without doing any real semantic
comparison. This fixture instead states the **same guidance in different
words** every time, and adds the same problem to source code: several pairs
of functions that do the same thing two different ways instead of sharing
one implementation. The goal is to see whether hybrid-mode enrichment
recognizes that rule X and rule Y say the same thing, not just that they
share text.

## What's in here

| Path | ~Bytes | Notes |
| --- | ---: | --- |
| `AGENTS.md` | ~4.3 KB | ~10 rules, each stated in its own wording. |
| `CLAUDE.md` | ~4.3 KB | Same rules as `AGENTS.md`, paraphrased — no shared sentences. |
| `.cursorrules` | ~4.2 KB | Same rules again, terser bullet phrasing. |
| `.github/copilot-instructions.md` | ~4.2 KB | Same rules again, yet another phrasing. |
| `src/validators/isValidEmail.js` | <1 KB | Email validation via regex. |
| `src/utils/checkEmailFormat.js` | <1 KB | Email validation via manual string parsing — same behavior, different approach. |
| `src/format/formatCurrency.js` | <1 KB | Currency formatting via `Intl.NumberFormat`. |
| `src/helpers/toMoneyString.js` | <1 KB | Currency formatting via hand-rolled cents math — same purpose, different approach. |
| `src/http/fetchWithRetry.js` | <1 KB | Retry-with-backoff wrapped around `fetch`. |
| `src/network/retryRequest.js` | <1 KB | Retry-with-backoff as a generic recursive wrapper — same idea, different shape. |
| `src/index.js` | <1 KB | Tiny unrelated source; control (not duplicated anywhere). |

No two instruction files, and no two source files in a pair, share a
sentence or a line of code. Every duplicate here is a paraphrase or a
re-implementation, never a copy-paste — deliberately, since
`fixtures/instructions-app` already covers the copy-paste case. One rule in
each instruction file (reuse the existing validator/formatter/retry helper
instead of writing a new one) is stated earnestly right next to code that
violates it — the fixture's source tree has three separate pairs of
functions doing exactly what the instructions say not to do.

All four instruction files sit below `OVERSIZED_BYTES` (100 KB) and above
`MIN_BORDERLINE_BYTES` (4 KB), so on their own they never flip `atRisk` in
the heuristic layer — same shape as `fixtures/instructions-app`. See
`fixtures/expected/semantic-duplicates-app-totals.json`.

## What this proves

1. **Heuristic-only** (`--mode heuristic`, default): none of the instruction
   or source files are findings — expected and pinned, since the heuristic
   layer has no concept of semantic content.
2. **Candidate selection**: `selectEnrichmentCandidates`
   (`packages/risk-core/src/candidates/candidates.ts`) still puts all four
   instruction files first via `isInstructionPath` basename matching, even
   though none of their content is byte-identical — path-based routing is
   unaffected by paraphrasing. The six duplicate `src/**` files also reach
   candidate selection via a dedicated `source`-class bucket
   (`docs/design/HEURISTICS_AUDIT.md` B8) — though the bucket has its own bounded
   budget, so this fixture alone isn't big enough to prove the fix under
   real-world load; see `packages/risk-core/src/candidates/candidates.test.ts`
   for that.
3. **Hybrid mode** (`--mode hybrid`): the `src/**` pairs should come back as
   `duplicate_logic` — a reason added specifically for this shape
   (`docs/design/HEURISTICS_AUDIT.md` B9), always `verdict: review` and never
   `exclude`, since both copies are still imported. With a real LLM backend,
   this is the fixture to point at manually to check whether
   `redundant_instructions` / `semantic_bloat` findings actually catch
   paraphrased rules and
   re-implemented logic, not just literal repeats — see
   `docs/testing/E2E_HYBRID_SCAN_TEST.md`. Not automated here, for the same reason
   `instructions-app` isn't: LLM output is non-deterministic.

## Layout

```text
fixtures/semantic-duplicates-app/
├── package.json
├── AGENTS.md
├── CLAUDE.md
├── .cursorrules
├── .github/copilot-instructions.md
└── src/
    ├── index.js                       # control — not duplicated
    ├── validators/isValidEmail.js     # duplicate pair 1 (regex)
    ├── utils/checkEmailFormat.js      # duplicate pair 1 (manual parsing)
    ├── format/formatCurrency.js       # duplicate pair 2 (Intl)
    ├── helpers/toMoneyString.js       # duplicate pair 2 (hand-rolled)
    ├── http/fetchWithRetry.js         # duplicate pair 3 (fetch wrapper)
    └── network/retryRequest.js        # duplicate pair 3 (generic recursive)
```
