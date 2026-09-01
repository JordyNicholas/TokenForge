# hybrid-eval-app (TokenForge hybrid eval fixture)

Synthetic **checkout-api** repo for **hybrid scan + hybrid apply** demos and manual
evaluation. Unlike `instructions-app` (verbatim paragraph repetition), instruction
files here read like **LLM-authored team policies**: paraphrased overlap, intentional
contradictions, and realistic context-bleed anti-patterns.

## What this proves

| Layer | Expected behaviour |
| --- | --- |
| **Heuristic scan** | Excludes `package-lock.json` and output-shape paths; keeps instruction files + `docs/RULEBOOK.md` + `openapi.yaml`. |
| **Hybrid scan** | Rich `redundant_instructions` / `semantic_bloat` findings; high `instructionBudget`; complementary `analysisOverview`. |
| **Hybrid apply** | Managed Copilot section with **complete, actionable** bleed-reduction rules (canonical `AGENTS.md`, do not load lockfile/CI dumps, etc.). |

## Layout

```text
fixtures/hybrid-eval-app/
├── AGENTS.md                          # canonical agent policy
├── CLAUDE.md                          # paraphrased overlap
├── .github/copilot-instructions.md    # includes bad lockfile-paste habit
├── .cursor/rules/checkout-api.mdc     # Cursor always-on rules
├── docs/RULEBOOK.md                   # load-bearing standards (must stay)
├── openapi.yaml                       # protected API contract
├── package-lock.json                  # heuristic exclude (~89% savings)
├── test-results/junit.xml             # output-shape exclude
├── coverage/lcov.info
├── GENERATION_BRIEF.md                # regen spec
└── src/                               # tiny keep-set
```

## Demo commands

```bash
# Hybrid presentation (default target after this fixture lands)
npm run tokenforge:presentation-hybrid -- fixtures/hybrid-eval-app

# Regenerate instruction files via Cursor CLI (optional)
npm run tokenforge:generate-hybrid-eval-instructions
```

## Golden totals

Pinned in `fixtures/expected/hybrid-eval-app-totals.json` (heuristic layer only).
Hybrid LLM output remains manual / non-deterministic — see
`docs/testing/E2E_HYBRID_SCAN_TEST.md`.
