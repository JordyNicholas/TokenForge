# TokenForge fixtures

Synthetic demo repos the CLI scans in tests and demos. None of these are npm
workspaces or product packages — see `package.json`'s `workspaces` field,
which does not include `fixtures/*`. There is no fixture manifest/schema:
`tokenforge scan` just walks a directory and scores whatever it finds via
`packages/risk-core/src/classify/classify.ts` and `score/score.ts`. Each
fixture below is pinned against a golden totals file in `fixtures/expected/`,
wired through `cli/src/test/helpers.ts`, and covered by tests under
`cli/src/commands/scan/` and `cli/src/savings/`.

| Fixture | Proves | Golden file |
| --- | --- | --- |
| `noisy-app/` | Recall: an extreme worst-case repo (padded lockfile, `dist/` junk, fat configs) gets a large, dominant `beforeTokens` baseline. | `expected/noisy-app-totals.json` |
| `lean-app/` | Precision (negative control): a small, healthy repo with no lockfile/generated/oversized paths produces `savedPercent` at 0% — TokenForge doesn't manufacture savings. | `expected/lean-app-totals.json` |
| `borderline-app/` | Precision (stress test): two legitimately large files (a hand-maintained `.ts` type surface, a real i18n config) still get `oversized` → `excluded`, and an unrelated `rules/` directory still gets prioritized for LLM enrichment. Documents two concrete heuristic gaps — see `docs/HEURISTICS_AUDIT.md` B1-B3. | `expected/borderline-app-totals.json` |
| `instructions-app/` | Hybrid/LLM candidate routing: verbose, duplicated `AGENTS.md`/`CLAUDE.md`/`.cursorrules`/`copilot-instructions.md` files stay out of the heuristic-only layer but are correctly prioritized as enrichment candidates for `--mode hybrid`. | `expected/instructions-app-totals.json` |
| `semantic-duplicates-app/` | Semantic redundancy stress test: the same rules/logic repeated but *paraphrased* every time (no shared sentences across instruction files, no shared code between duplicate source pairs) — checks whether hybrid-mode enrichment reasons about meaning instead of matching text. | `expected/semantic-duplicates-app-totals.json` |
| `monorepo-config-app/` | Candidate routing for duplicated *configuration* (#136): three per-package `tsconfig.json` copies carrying the same settings, the last one with `"strict": true` expanded into its eight flags so no text is shared. Heuristic scan finds **0 findings on purpose** — redundancy has no size or filetype signal. The `package.json` trio is the false-positive control: same basename, genuinely different contents. | `expected/monorepo-config-app-totals.json` |
| `heuristic-edge-app/` | Precision **and** recall for the #135 protection rules — the fixture where what's *absent* from the findings matters most: a 153 KB `openapi.json`, a `tsconfig.json`, and a generated GraphQL surface must stay unflagged, while 86 KB of recorded fixture data (under the flat 100 KB bar) must now be caught. Also holds two fake-credential files that must never reach an LLM enricher. See `docs/HEURISTICS_AUDIT.md` B11-B15. | `expected/heuristic-edge-app-totals.json` |

## Adding a new fixture

There's no declarative format to write. To add one:

1. Create `fixtures/<name>/` with real files — content decides classification,
   nothing else does (see `classifyFiletype` for the lockfile/generated/
   source/config rules and `OVERSIZED_BYTES`/`MIN_BORDERLINE_BYTES` in
   `packages/risk-core/src/domain/constants.ts` for the size thresholds).
2. Add a short `README.md` inside the fixture explaining what it's meant to
   prove and why its files are shaped the way they are.
3. Run `node ./cli/bin/tokenforge.mjs scan fixtures/<name> --json` and pin the
   real output into `fixtures/expected/<name>-totals.json` (same shape as the
   existing golden files) — don't hand-compute expected totals.
4. Add root/expected-path exports to `cli/src/test/helpers.ts` and a
   regression test that compares `scanRepo(root)` against the golden file
   (see `cli/src/savings/savings.fixtures.test.ts`).
5. If a test writes to the fixture (`runCli scan`, `apply`), clean up with
   `cleanupFixtureAt(root)` in `afterEach` — never commit a fixture with its
   own real `.github/` instruction file if a test also runs `apply` against
   it, since cleanup deletes `.github/` unconditionally.
