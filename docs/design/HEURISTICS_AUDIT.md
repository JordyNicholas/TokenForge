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

Not a bug: [`PITCH_FAQ.md`](../product/PITCH_FAQ.md) already documents this as intentional,
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
- ~~`tallyLlmTotals`/`tallyCombinedTotals` (`packages/risk-core/src/layers/
  totals.ts`) don't handle a `verdict: "review"` finding explicitly — it's
  neither `excluded` nor `filtered`, so it's silently excluded from savings
  math; untested.~~ **Covered** — see B10. The behavior turned out to be
  correct (a path you cannot delete must not count as a saving), and it is now
  pinned in `packages/risk-core/src/layers/layers.test.ts` and
  `cli/src/commands/scan/scan.hybrid.test.ts`. It became load-bearing with B9,
  since `duplicate_logic` is always `review`.

The remaining gaps are not fixed (audit-only, per this doc's original scope);
they're listed so a future pass can turn each into a targeted unit test
alongside whichever heuristic change it's motivated by.

## B8 — `source`-class files had no path into LLM candidate selection

**Status:** Fixed (unlike B1-B7, which remain audit-only per this doc's
original scope).

**Where:** `packages/risk-core/src/candidates/candidates.ts`
(`isBorderline`, `selectEnrichmentCandidates`).

**Previous behavior:** `isBorderline` only considered `fileClass` `"config"`
or `"unknown"` — `"source"` was excluded outright, and there was no
equivalent of `isInstructionPath` for source code. The only remaining path,
`topEligible`, ranked every eligible file (any class) by raw byte size in
one global list capped at `topCount` (default 10). A small source utility
file (a validator, a formatter, a retry wrapper — routinely a few hundred
bytes) lost that ranking to literally any bigger file elsewhere in the repo,
regardless of class. In practice this meant `source` files essentially never
reached the LLM enrichment pass on their own merit in any repo bigger than a
handful of files.

**Demonstrated by:** `fixtures/semantic-duplicates-app/src/**` — six small
(<600 byte) source files, deliberately shaped like real-world duplicate
utility code. The fixture alone was too small to expose the bug (everything
fit under the old caps anyway); the real regression proof is
`packages/risk-core/src/candidates/candidates.test.ts`, which shapes a repo
with several large docs and a couple of small source files and confirms the
small ones survive selection.

**Risk:** the hybrid/LLM enrichment pass could only ever "see" application
source code that happened to be unusually large — structurally blind to
small/medium source files, which is where duplicate helper logic most often
accumulates.

**Fix:** added `topSourceEligible`, a bucket ranked within the `source`
class alone (no byte floor), inserted into `selectEnrichmentCandidates`'s
priority order right after `instruction` and before the (still uncapped,
B4) `borderline` bucket, so it can't be starved before the global
`maxCandidates` cap. New `DEFAULT_SOURCE_CANDIDATE_COUNT` /
`sourceTopCount` option controls its size (default 5). This is a
fairness/visibility fix only — it does not attempt to detect duplication
itself (that stays the LLM pass's job) and does not guarantee every source
file in a large repo becomes a candidate, only that `source` competes on
the same terms `config`/`unknown` already did.

## B9 — the LLM pass could not express duplicated *logic*, only duplicated *instructions*

**Status:** Fixed.

**Where:** `packages/enrichers/src/multipass/prompts.ts`,
`packages/enrichers/src/structured.ts`,
`packages/enrichers/src/multipass/reconcile.ts`,
`packages/risk-core/src/domain/types.ts`.

**Previous behavior:** B8 got `source` files as far as the enrichment
candidate list, but every layer downstream was written for agent guidance:

1. `buildMapInventoryBlock` attached a content `digest:` **only** for
   instruction paths, so Pass A saw source candidates as a path and a byte
   count — no content, therefore no way to cluster them by meaning.
2. `MAP_SCHEMA_RULES` defined `clusters` as paths that "overlap or duplicate
   guidance".
3. `FindingReason` offered only `semantic_bloat | redundant_instructions |
   low_signal_config`, and `ENRICHMENT_POLICY_RULES` correctly forbade using
   `redundant_instructions` for code — so there was no legal way to report it.
4. `reconcileFindings` downgraded any uncorroborated `redundant_instructions`
   to `semantic_bloat`, and per (1)/(2) a source pair rarely reached the map.

**Demonstrated by:** `fixtures/semantic-duplicates-app/src/**` — three pairs of
files implementing the same behavior under different names.

**Risk:** duplicated helper logic is a common, real source of token waste and
drift, and the pipeline was structurally unable to name it. Overloading
`redundant_instructions` instead would have meant deleting a guardrail that
exists to stop a model recommending real application code be excluded.

**Fix:** added a `duplicate_logic` reason (report schema **v0 → v1**; the
predecessor is frozen at `docs/schemas/risk-event.v0.schema.json`, and v1 is a
strict superset). Pass A now digests `source`-class paths too; the Pass A/B/C
prompts and the Codex structured-output schema learned the reason; and the
reconcile net weakens an uncorroborated claim rather than relabelling it.

The reason is **advisory only and never `exclude`** — enforced in
`parseStructuredFindings` (the choke point every backend shares), not merely
requested in the prompt. Suggestion kind is `consolidate_duplicates` (#114) so
it stays out of `HYGIENE_KINDS` and can never leak into a synthesized lean
AGENTS.md — and so advice is not vague `review` prose.

**Shipped (#114):** `SUGGESTION_KINDS` includes `consolidate_duplicates` (report
schema **v1 → v2**; predecessor frozen at `docs/schemas/risk-event.v1.schema.json`).
`apply` remains policy-pack-only.

## B10 — no test seam for hybrid enrichment; the LLM path only ever ran empty

**Status:** Fixed.

**Where:** `cli/src/commands/scan/scan.ts` (`runHybridEnrichment`,
`ScanOptions`), `packages/enrichers/src/registry.ts`.

**Previous behavior:** `runHybridEnrichment` resolved
`getEnricher(spec.backend)` directly, and the registry is a fixed switch over
four real backends. With no injection point, the four CLI tests running
`mode: "hybrid"` could only use `noop`, which returns zero findings. So the
wiring from candidates through the enricher, `mergeFindings`, `buildScanLayers`
and the totals was **only ever exercised with an empty findings array** —
every one of those units had its own test, but the seam between them had none.

**Risk:** the entire hybrid output path — which layer a finding lands in, what
`scan.llm` metadata is recorded, and above all the savings arithmetic — was
unverified end to end. B9 made this sharper: `duplicate_logic` is always
`verdict: review` → `action: "kept"`, so 100% of that feature's findings travel
the one branch of the totals filter that B7 had already flagged as untested.

**Fix:** added an optional `ScanOptions.enricher`, following the convention
already set by `now?: Date` and `onProgress`. The production registry is
untouched and omitting the option still resolves it, so the pre-existing hybrid
tests pass unchanged. `cli/src/commands/scan/scan.hybrid.test.ts` then drives a
scripted enricher against `fixtures/semantic-duplicates-app` to pin layer
routing, `scan.llm` metadata, and three totals cases: excluded counts, kept
does not, and a mixed batch counts only the excluded path.

The savings assertions were checked for teeth by temporarily folding `kept`
into the `tallyLlmTotals` filter — both go red, so they are guarding real
behavior rather than restating it.

**Noted while writing the tests:** `src/validators/isValidEmail.js` is *not* an
enrichment candidate for that fixture. At 193 bytes it is the smallest of its 7
source files, one more than `DEFAULT_SOURCE_CANDIDATE_COUNT` (5) — the B8
bucket working to budget, as documented in the fixture README.

---

# Edge-case pass (2026-08-26)

B11–B15 come from a second review, driven by ten `.json`-shaped cases where
extension and size alone give the wrong answer (issue #135). Each is
demonstrated by `fixtures/heuristic-edge-app/` and covered by
`cli/src/commands/scan/scan.protected.test.ts`.

The shared shape: `classifyFiletype` reads **name**, `scoreRisk` reads
**size**, and neither can see that some paths are load-bearing for the agent.
The fix is a third pure-path input — `packages/risk-core/src/protect/protect.ts`
— that suppresses exclusion-driving reasons without touching the token math.

## B11 — a large API contract is penalized for being complete

**Status:** Fixed.

**Where:** `packages/risk-core/src/score/score.ts`, `domain/constants.ts:16`
(`OVERSIZED_BYTES`).

**Previous behavior:** an `openapi.json` / `swagger.yaml` crossing 100 KB got
`reason: "oversized"` → `action: "excluded"`, the same recommendation a padded
lockfile gets.

**Demonstrated by:** `fixtures/heuristic-edge-app/openapi.json` (153 KB, 120
real paths + component schemas).

**Risk:** the correlation runs backwards here. The more completely a team
documents its API, the larger the contract, and the more likely TokenForge
recommended hiding it from the agent that needs it to avoid inventing
endpoints. This is B2 with the sign flipped: not "large but legitimate", but
"large *because* legitimate".

**Fix:** `API_CONTRACT_PATTERNS` → `protectionFor` suppresses `oversized` for
recognized contract basenames. `high_risk_filetype` is deliberately **not**
suppressed — a contract inside `dist/` is still build output.

## B12 — a protected config survives only by being small

**Status:** Fixed.

**Where:** same as B11.

**Previous behavior:** `tsconfig.json`, `.eslintrc.json`, and feature-flag
files were never flagged — but only because they sit under the size bar. No
rule protected them; the outcome was luck.

**Demonstrated by:** `fixtures/heuristic-edge-app/tsconfig.json`.

**Risk:** latent rather than active. Any future threshold change (including
B14 below, which lowers a bar) or a genuinely large generated `tsconfig` in a
big monorepo would start recommending exclusion of the file that tells the
agent how the project builds.

**Fix:** `PROTECTED_CONFIG_NAMES` + `PROTECTED_CONFIG_PATTERNS` suppress both
`oversized` and `high_risk_filetype`, so the protection is a rule at any size.

## B13 — `generated` is treated as uniformly disposable

**Status:** Fixed.

**Where:** `packages/risk-core/src/classify/classify.ts`,
`domain/constants.ts:18` (`HIGH_RISK_FILE_CLASSES`).

**Previous behavior:** two separate problems. A `generated/` directory was not
in `GENERATED_DIR_NAMES` at all (only `dist`/`build`/`out`/`coverage`/
`node_modules`/`.next`/`target`, plus the Prisma special case), so
`src/generated/**` was classified by extension like hand-written code. And
where a tree *was* classified `generated`, class weight 0.9 made it
unconditionally high-risk.

**Demonstrated by:** `fixtures/heuristic-edge-app/src/generated/graphql/`.

**Risk:** both directions were wrong. Genuinely generated trees escaped
detection, while generated **API clients and schemas** — which an agent reads
to call the API correctly — were lumped in with compiled bundles.

**Fix:** `generated` / `.generated` added to `GENERATED_DIR_NAMES` (closing the
first half), and `isNecessaryGeneratedPath` exempts the
`generated/<graphql|openapi|swagger|api>/**` pairing from `high_risk_filetype`
(closing the second). The pairing requirement keeps a hand-written
`src/graphql/` out of it. `oversized` still applies: a necessary schema that is
enormous is still worth surfacing.

## B14 — bulk auxiliary data hides under the bar meant for source

**Status:** Fixed.

**Where:** `packages/risk-core/src/score/score.ts`, `domain/constants.ts:16`.

**Previous behavior:** one flat 100 KB threshold for every path. A tree of
recorded test payloads or mock responses — each file individually
unremarkable, collectively expensive — produced no finding at all.

**Demonstrated by:** `fixtures/heuristic-edge-app/test/fixtures/recorded-orders.json`
(86 KB, i.e. deliberately **under** the flat bar).

**Risk:** the false-negative counterpart to B2/B3, and the one a PR gate would
miss: a developer adding a folder of auxiliary data inflates `beforeTokens`
with nothing marked `atRisk`, so any check keyed on findings reports clean.

**Fix:** `AUXILIARY_OVERSIZED_BYTES` (25 KB) applies under recognized
`fixtures`/`mocks`/`test-data`/`snapshots` trees. This is the narrow version of
B3's "scale `OVERSIZED_BYTES` by class" recommendation: the reason stays
`oversized` (no contract change), only the bar moves — and `sizeWeight` uses
the same bar so the continuous score does not disagree with `reasons`.

## B15 — nothing stopped a credential from reaching an LLM enricher

**Status:** Fixed.

**Where:** `packages/risk-core/src/candidates/candidates.ts`,
`cli/src/commands/scan/scan.ts` (`loadCandidateExcerpt`).

**Previous behavior:** `selectEnrichmentCandidates` ranked by instruction path,
source sample, borderline size, and largest-file — none of which is a security
check. A `.env`, a service-account JSON, or a `.pem` was an ordinary `config`
path eligible for the borderline bucket, and in `--mode hybrid` its excerpt was
read and sent to the configured backend, which may be **external** (`codex`,
`anthropic`).

**Demonstrated by:** `fixtures/heuristic-edge-app/config/service-account.json`
(credential-shaped name) and `config/app-settings.json` (innocuous name, AWS
placeholder key in the body).

**Risk:** the highest-severity item in either pass, and the only one that is
not a cost question. Every other finding here is "we recommended the wrong
file"; this one exfiltrates a secret. Note the circularity that rules out the
obvious mitigation: asking a remote model *whether* a file holds a secret has
already sent it the secret.

**Fix:** two gates, because neither alone is sufficient.

1. **Name gate**, `isSecretPath` in `risk-core` — runs before every candidate
   bucket, not as a filter on the result, so a credential-shaped path can
   never be selected. `.env.example` / `.sample` / `.template` are exempt:
   those carry the shape of a secret, not one.
2. **Content gate**, `hasSecretContent` in `packages/enrichers` — runs at the
   CLI read boundary, where the excerpt already exists, and catches the
   innocuously named file the name gate cannot see. The candidate is dropped
   whole rather than redacted: a redacted excerpt still tells a remote model
   where the secret lives.

`risk-core` stays filesystem-free, so the content half necessarily lives at the
CLI edge — that split is architectural, not incidental.

## Left open by this pass

- **Field-level JSON.** A `package.json` mixes high-value (`scripts`,
  `workspaces`) with noise (`devDependencies`) in one file. Every rule here
  decides per path, and the Token Risk contract has one verdict per path, so
  there is no honest way to express "keep half of this file".
- **Recency.** A dated report (`audit-2026-01.json`) is relevant the week it is
  written and noise a month later, with no change to name, size, or class. The
  extension has `inactiveMs` for open tabs; the repo scan has no time signal at
  all. `git log` mtime was considered and left out: "recently edited" is not
  "recently relevant" — a formatter pass would forge the signal.
- **Task context.** ~~Whether a large i18n locale file is waste depends on
  whether the developer is doing i18n work *right now*. Not solvable in a
  static scan at any level of rule sophistication; tracked as extension → CLI
  routing in issue #137.~~ **Closed by #137**, and the diagnosis held: it was
  not solved by a better rule but by a different *input*. The extension
  publishes open tabs as `activePaths`, `scan --active-paths-file` reads them,
  and an open path is downgraded to `kept` rather than proposed for exclusion.
  Runbook: [`E2E_ACTIVE_SESSION_TEST.md`](../testing/E2E_ACTIVE_SESSION_TEST.md).
