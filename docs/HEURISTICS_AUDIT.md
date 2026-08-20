# Heuristics audit (2026-08-20)

Scope: `packages/risk-core/src/{score,classify,candidates,estimate}` — the
3-rule heuristic engine behind `tokenforge scan`'s default (non-LLM) mode.
This is an audit only: findings and recommendations, no production code
changed. Each item below is empirically demonstrated by one of the fixtures
in `fixtures/` (see `fixtures/README.md`), so a future fix can be checked
against a real regression test instead of a hypothetical.

## B1 — `isInstructionPath` matches a bare path segment, not a real location

**Where:** `packages/risk-core/src/candidates/candidates.ts:21-29`,
`domain/constants.ts:60-63` (`INSTRUCTION_PATH_SEGMENTS = {".cursor", "rules"}`).

**Current behavior:** any path with a segment literally equal to `"rules"` or
`".cursor"`, at any depth, is treated as an AI agent instruction file and
prioritized for the (paid) LLM enrichment pass — regardless of what's
actually in it.

**Demonstrated by:** `fixtures/borderline-app/rules/pricing-notes.md`, a
plain business document about pricing tiers. Running
`selectEnrichmentCandidates` against that fixture puts it **first** in the
candidate list, ahead of two files that are 150x larger
(`cli/src/commands/scan/scan.borderline.test.ts`).

**Risk:** wastes enrichment budget/LLM calls on irrelevant files in any repo
that happens to have a `rules/` directory for something else (business rules,
firewall rules, linter rules, etc.) — plausible in real codebases, not just
this synthetic fixture.

**Recommendation:** require `"rules"` to appear directly under a recognized
agent-config parent (`.cursor/rules`, `.claude/rules`, `.github/rules`)
instead of matching the bare segment anywhere in the path. `.cursor` alone is
probably fine to keep as a bare match since it's a much more specific name.

## B2 — `action: "excluded"` doesn't look at file class

**Where:** `cli/src/commands/scan/scan.ts:124-137` (`toFinding`), fed by
`scoreRisk` (`packages/risk-core/src/score/score.ts:65-70`).

**Current behavior:** any finding with `atRisk: true` — including `oversized`
fired alone, on a `source`-class file — gets the exact same
`action: "excluded"` as a `lockfile` or `generated` finding. `apply`
(`cli/src/commands/apply/apply.ts`) turns `excluded` findings into a
provider-specific exclusion-candidates file meant for a human to paste into
org-level content-exclusion settings (e.g. GitHub Copilot).

**Demonstrated by:** `fixtures/borderline-app/src/generated-types.ts` (a
~120KB hand-maintained TypeScript type surface, `source` class, weight 0.15)
and `config/locales.json` (~125KB real i18n config, `config` class, weight
0.5) both come back as `reason: "oversized"`, `action: "excluded"` — see
`fixtures/expected/borderline-app-totals.json` and
`cli/src/commands/scan/scan.borderline.test.ts`.

**Risk:** this is the highest-impact finding in this audit. The tool's own
"Fix" step can recommend excluding real, in-context-relevant source code or
config from an AI coding agent's view, purely because the file crossed a flat
100KB line — with no signal about whether the content is actually low-value.

**Recommendation:** don't recommend `excluded` for an `oversized`-only
finding when `fileClass` is `source` (or require a materially higher
size threshold for that class specifically). Reserve unconditional exclusion
for `high_risk_filetype` (lockfile/generated), where class alone is already a
strong signal regardless of size.

## B3 — One flat 100KB threshold for every file class

**Where:** `domain/constants.ts:16` (`OVERSIZED_BYTES = 100_000`) applied
uniformly in `score.ts:65-67`, even though `CLASS_WEIGHT` (`:24-30`) already
encodes that classes carry very different risk (lockfile 1.0 vs. source
0.15).

**Current behavior:** the continuous `score` down-weights source-class size,
but the binary `reasons` list (and therefore `action`) does not — see B2.

**Recommendation:** same fix as B2 covers this; alternatively, scale
`OVERSIZED_BYTES` by class (e.g. a materially higher bar for `source`) so the
binary reason tracks the same intuition as the score.

## B4 — The "borderline" candidate bucket has no cap of its own

**Where:** `packages/risk-core/src/candidates/candidates.ts:31-40,58`
(`isBorderline`), combined with a global `maxCandidates = 30` in
`selectEnrichmentCandidates`.

**Current behavior:** every `config`/`unknown` file ≥ `MIN_BORDERLINE_BYTES`
(4KB) that isn't already `atRisk` goes into the borderline bucket with no
per-bucket limit — already flagged in a comment in
`packages/risk-core/src/candidates/candidates.test.ts`, but never treated as
a design gap. In a repo with many mid-size config files, borderline entries
could crowd out real instruction files or the largest-file (`topEligible`)
bucket before the global cap is reached, since `ordered` concatenates
`instruction + borderline + topEligible` and the loop stops at 30.

**Recommendation:** give the borderline bucket its own sub-cap (e.g. 10,
matching `DEFAULT_TOP_CANDIDATE_COUNT`), or move it after `topEligible` in
priority order.

## B5 — `estTokens = ceil(bytes / 4)` is a coarse proxy (accepted trade-off)

**Where:** `packages/risk-core/src/estimate/estimate.ts`,
`BYTES_PER_TOKEN = 4`.

Not a bug: `docs/PITCH_FAQ.md` already documents this as intentional,
hackathon-grade math, not a claim about any real tokenizer. Listed here only
for completeness of the audit.

## B6 — No graded severity, only binary `atRisk` + a continuous `score`

**Where:** `domain/types.ts` (`RiskAssessment.atRisk: boolean`,
`score: number`), `REASON_PRIORITY` in `score/score.ts:14-18`.

**Current behavior:** `primaryReason()` picks one reason via an implicit,
code-only priority order (`high_risk_filetype > oversized > inactive_tab`)
when a path matches more than one rule — there's no severity tier (low/
medium/high) surfaced anywhere, and the priority order isn't documented
outside the source.

**Recommendation:** not urgent, but worth documenting the priority order in
the JSON schema (`docs/schemas/risk-event.schema.json`) or report docs so
downstream consumers (dashboard, adapters) don't have to read
`score.ts` to know it.

## B7 — Test coverage gaps found while building the fixtures above

- No existing test exercises a **3-way** reason overlap
  (`high_risk_filetype` + `oversized` + `inactive_tab` on the same path) to
  confirm `primaryReason`'s priority order under full contention.
- No boundary test at exactly `bytes === OVERSIZED_BYTES` (100,000) for the
  `sizeWeight` clamp, and none above it to confirm the weight stays clamped
  at 1.0 rather than continuing to grow.
- `classifyFiletype`'s extension tables are untested for `.env`/`.toml`/
  `.ini` config extensions, uncommon source extensions, and extensionless
  filenames (all fall to `unknown` — never asserted).
- `walkFiles`'s symlink skip (`cli/src/commands/scan/scan.ts:103-105`) has no
  test confirming a symlinked large file is excluded rather than crashing or
  double-counting.
- `tallyLlmTotals`/`tallyCombinedTotals` (`packages/risk-core/src/layers/
  totals.ts`) don't handle a `verdict: "review"` finding explicitly — it's
  neither `excluded` nor `filtered`, so it's silently excluded from savings
  math; untested.

None of these gaps are fixed in this round (audit-only, per scope); they're
listed so a future pass can turn each into a targeted unit test alongside
whichever heuristic change it's motivated by.
