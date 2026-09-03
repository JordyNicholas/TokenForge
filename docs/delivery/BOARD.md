# TokenForge board map

Project: [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2)

Columns: **To-Do**, **In Progress**, **Ready for Review**, **Done**, **Epics Finished**.

Stories land in **Done** when they close. An `[Epic]` moves to **Epics Finished** when **all of its child stories are closed** (workflow auto-closes the epic). Open Phase 2 epics stay in **To-Do** until that happens.

## Epics

MVP (closed → **Epics Finished**):

| Epic | Issue | Phase |
| --- | --- | --- |
| Foundation | #1 | E0 |
| Risk core & fixtures | #2 | E1 |
| CLI policy pack | #3 | E2 |
| ROI dashboard (React) | #4 | E3 |
| VS Code extension | #5 | E4 |
| Demo polish & pitch | #6 | E5 |

Phase 2. Former catch-all #7 was split:

| Epic | Issue | Phase | Board |
| --- | --- | --- | --- |
| F1 Hybrid Detect backends | #60 | Future | **Epics Finished** |
| F1.1 Hybrid Detect — Claude Code CLI backend | #145 | Future | **Epics Finished** (#166/#167 remain as follow-on stories; epic closed) |
| F2 Prove at org scale | #61 | Future | **Epics Finished** (Wave C / #99–#100 remain as follow-on stories; epic closed) |
| F3 Adjacent (do not pitch) | #62 | Future | **Epics Finished** |
| F4 Extension session Prove & provider CLI transports | #156 | Future | **To-Do** (open) |
| F5 RTK-inspired native product patterns | #177 | Future | **To-Do** (open; #176 **Done**) |
| F6 AI-first complementary hybrid Detect | #199 | Future | **Epics Finished** (#189 shipped with #224) |
| F7 Hybrid Fix: heuristic-routed LLM policy synthesis | #225 | Future | **Epics Finished** |
| F8 Extension rebuild Wave A: Foundation | #237 | Future | **To-Do** (open) |
| F9 Extension rebuild Wave B: Real Shield | #238 | Future | **To-Do** (open) |
| F10 Extension rebuild Wave C: Session AI | #239 | Future | **To-Do** (open) |
| F11 Extension rebuild Wave D: Instructions & Fix in IDE | #240 | Future | **To-Do** (open) |
| F12 Extension rebuild Wave E: Discover & advisory | #241 | Future | **To-Do** (open) |
| F13 Extension rebuild Wave F: Prove, docs & ship | #242 | Future | **To-Do** (open) |
| F14 Heuristic Fix: robust deterministic policy synthesis | #283 | Future | **To-Do** (open) |
| F15 Extension AI-First: first-class local LLM judgment | #306 | Future | **Epics Finished** (#307–#311) |

**Extension rebuild (F8–F13):** one epic per wave; implement **in order F8 → F13**, one wave per delivery occasion. Plan: extension rebuild plan in `.cursor/plans/`. Product doc target: `docs/design/EXTENSION_PRODUCT.md` (#249 skeleton, #280 complete). Absorbs F4 session Prove UI (#157–#160), F5 #170 discover (F12), board candidate one-click Fix from extension (F11).

F1.1 continues F1 #60 (closed) rather than reopening it — same rule applied to
#136 below. It adds a `claude-code` enricher that drives the Claude Code CLI
(`claude -p`) on a subscription login, the Anthropic analogue of `codex` (#45).

## Stories

### MVP (done)

| Issue | Title | Epic |
| --- | --- | --- |
| #8 | Scaffold npm workspaces monorepo | E0 |
| #9 | Document PROJECT_TOKEN + GitHub UI toggles | E0 |
| #10 | Implement packages/risk-core | E1 |
| #11 | Create fixtures/noisy-app | E1 |
| #12 | Formalize .tokenforge JSON schema | E1 |
| #13 | CLI: scan command | E2 |
| #14 | CLI: apply policy pack via provider adapter | E2 |
| #15 | CLI: before/after savings report | E2 |
| #16 | Scaffold React dashboard | E3 |
| #17 | Assumptions panel + calculator | E3 |
| #18 | BU overview / heatmap / offenders | E3 |
| #19 | Seeded demo data + JSON load | E3 |
| #20 | Scaffold VS Code extension | E4 |
| #21 | Track tabs + idle / high-risk rule (now 10m focused / 5m background) | E4 |
| #22 | Status bar + panel + JSON export | E4 |
| #23 | Demo script + runbook | E5 |
| #24 | Pitch FAQ (vs Auto Memory) | E5 |

### Hybrid Detect — shipped (historically under #7)

| Issue | Title |
| --- | --- |
| #41 | Hybrid scan design + JSON scaffolding |
| #42 | risk-core: enrichment candidate selection + merge |
| #43 | CLI: LLM enricher port + hybrid orchestration |
| #44 | CLI: Ollama LLM enricher (local Qwen) |
| #47 | Dashboard: hybrid scan + LLM finding display |
| #54 | Dashboard: finding details + heuristic explanations |
| #55 | Advisory finding suggestions (copy-only) |

### Phase 2 — open / shipped slices

| Issue | Title | Epic | Status |
| --- | --- | --- | --- |
| #45 | CLI: Codex CLI enricher | F1 #60 | Done |
| #46 | CLI: Anthropic enricher | F1 #60 | Done |
| #66 | CLI: multi-pass local-first LLM enrich | F1 #60 | Done |
| #48 | Extension: optional LLM enricher | F1 #60 | Done |
| #114 | Core: suggestion vocabulary for duplicated code | F1 #60 | **Done** — `consolidate_duplicates` kind (schema v2); `apply` stays policy-pack-only |
| #27 | Live usage metrics / billing sync (per provider) | F2 #61 | **Shipped through Wave B:** import + live `UsageProvider` adapters (fixture/Copilot/Cursor/Claude) + variance board + `usage-sync`. **Remaining under #61:** Wave C attribution (#95–#98) |
| #28 | Apply org content exclusions / policy (per provider) | F2 #61 | **Thin slice shipped:** `tokenforge org-pack` + Cursor/Claude adapters (local files). **#99:** `tokenforge org-apply` PolicyApply port. **#100:** `tokenforge pilot` / `tokenforge:pilot` scan → apply → Prove path || #25 | Chat history compaction assistant | F3 #62 | **Thin slice shipped:** advisory panel on Overview (do not pitch first) |
| #26 | Intelligent model routing | F3 #62 | **Thin slice shipped:** advisory panel + Assumptions hint (do not pitch first) |
| #137 | Extension → CLI active-session paths | F3 #62 | **Done** — see the edge-case pass below |

#49 (hybrid pitch FAQ + deck) closes with the board-map docs PR. Context Guard auto-filter and the 10m/5m idle rule landed on `main` after #22 without a separate story. Exec-board pitch refresh + per-team Prove landed with the F2/F3 thin slices above.

A hybrid-scan hardening run landed on `main` outside the epic structure, driven
by one stress fixture: #105 (`fixtures/semantic-duplicates-app` — duplicates
that are paraphrased rather than copy-pasted) exposed three gaps, each fixed and
audited in [`HEURISTICS_AUDIT.md`](../design/HEURISTICS_AUDIT.md) — #108 (B8: `source`
files could not reach LLM candidate selection), #110 (B9: no reason code for
duplicated *logic*, only duplicated *instructions*), #112 (B10: no test seam, so
the hybrid merge/totals path only ever ran with zero findings). #114 above is the
fourth gap from the same run, left open by choice.

### Edge-case pass (#135–#137)

A second review, driven by ten `.json`-shaped cases where extension + size alone
give the wrong answer. Audited as B11–B15 in
[`HEURISTICS_AUDIT.md`](../design/HEURISTICS_AUDIT.md).

| Issue | Title | Epic | Status |
| --- | --- | --- | --- |
| #135 | risk-core: heuristic allowlists, path-convention detection, pre-enrichment secret gate | — (audit line, like #105/#108/#110/#112) | **Done** — PR #138. B11–B15: `protect/protect.ts` exempts API contracts / build configs / necessary generated trees from exclusion; `AUXILIARY_OVERSIZED_BYTES` catches bulk fixture data under the flat bar; two credential gates (name in risk-core, content at the CLI read boundary) keep secrets out of LLM enrichment |
| #136 | enrichers: extend redundant-config detection across workspace packages | — (audit line) | **Done** — PR #139. `redundant_config` reason (schema v3), repeated-basename candidate bucket, Pass A digests for repeated configs. Advisory only, reusing `dedupe_rules` |
| #137 | extension ↔ CLI: surface active-session paths so Fix never suggests excluding what's in use | F3 #62 | **Done** — PR #140. `activePaths` on the contract (schema v4), `scan --active-paths-file`, extension publishes open tabs. First tested integration point between extension and CLI |

Three cases were deliberately **not** closed and are recorded with their reasons
in `HEURISTICS_AUDIT.md` ("Left open by this pass"): field-level JSON (the
contract has one verdict per path), and recency (git mtime conflates "recently
edited" with "recently relevant"). Task context was the third and is now closed
by #137 — not by a better rule, but by a different input.

**Note on #136's epic.** It was originally filed under F1 #60, which had already
closed when F1 completed — a filing mistake, since it would have left #60 in
*Epics Finished* with a later child. **Resolved by reclassifying #136 as an
audit-line item** rather than reopening the epic: the work continues #66/#114
in spirit, but hybrid-scan hardening driven by a stress fixture is precisely the
pattern that has run outside the epic structure before (#105/#108/#110/#112).
F1 stays closed and complete.

**Repo hygiene surfaced by this pass.** #141 — nothing runs `typecheck` / `test`
/ `build` on a pull request, which is how a duplicated export block from #94
survived 13 merged PRs before PR #138 fixed it. The golden-totals fixtures added
above are the regression net for the heuristic engine, and a net nobody runs on
PRs catches nothing.

### F1.1 — Claude Code CLI backend (#145, complete)

Design: [`HYBRID_SCAN_DESIGN.md`](../design/HYBRID_SCAN_DESIGN.md). Manual verification:
[`E2E_CLAUDE_CODE_ENRICH_TEST.md`](../testing/E2E_CLAUDE_CODE_ENRICH_TEST.md).

| Issue | Title | Depends on | Status |
| --- | --- | --- | --- |
| #146 | core: register the `claude-code` enricher backend id (+ report schema enum) | — | **Done** — PR #152. v4 frozen, live schema bumped to v5 |
| #147 | CLI/enrichers: `claude-code` enricher adapter (Claude Code CLI, subscription login) + spec parse + registry + docs | #146 | **Done** — PR #155 |
| #148 | CLI: `--llm claude-code` flags/help + scan integration tests + manual E2E doc | #147 | **Done** — PR #164 |
| #149 | Extension: treat `claude-code` as an external enricher backend | #147 | **Done** — PR #165 |
| #150 | Docs: index this epic in `BOARD.md` (this table) | — | **Done** — PR #151 |

Epic auto-closed when #149 landed → **Epics Finished**.

**Verified against the real binary** (Claude Code v2.1.247), which is the part
worth remembering. The first adapter passed `--max-turns 1`, taken from the
published CLI reference; the flag does not exist. Every unit test passed anyway,
because they all inject a fake command runner — the gap is structural, not an
oversight, which is why the E2E runbook leads with grepping `claude --help`.

#### Follow-on stories (epic closed, not reopened)

Same pattern as #99/#100 after F2 #61 closed, and the audit-line items above.
Deliberately **not** filed under F4 #156, which excludes Claude Code stories.

| Issue | Title | Depends on |
| --- | --- | --- |
| #166 | risk-core: single-source and enforce the 30-candidate enrichment cap | — |
| #192 | enrichers: per-backend excerpt budget + a large-model Anthropic output cap | — |
| #167 | enrichers: give the CLI-transport backends cross-batch context | #166, #192 |

All three come out of the #148 verification pass and the #167 re-scope.

**#166 started as a cost story** — the CLI-transport backends (`codex`,
`claude-code`, `gemini-cli`, `cursor-cli`, all flat-batching at `*_BATCH_SIZE =
4` with a fresh process per batch) looked like they re-paid a ~30K-token session
prefix on every batch. **Measured on Claude Code v2.1.247 and it does not**: the
~23K stable prefix is a `cache_read` on every batch (1-hour cache), a cold scan
pays full creation only on batch 1, and a whole 3-batch scan costs ~$0.14. The
cost levers (session reuse, bigger batches) are closed, won't-do. What remains is
the regression guard: `MAX_ENRICHMENT_CANDIDATES` is exported and documented as
the hard cap but wired to nothing — the real limit is a `?? 30` fallback inside
`selectEnrichmentCandidates`, and the CLI scan path passes no cap at all. Make it
a named `risk-core` default, enforced by contract. ~0.5d.

**#167 is a recall bet, not a cost fix.** Flat batching means a batch cannot see
files in another batch; multipass (map → judge → reconcile, already used by
Ollama) groups related files deliberately. It costs `1 + N + 1` model calls at
~$0.05 each — 2 extra per scan — paid back only if the fixture comparison shows
it surfaces cross-file redundancy that flat batching misses. #166 is a hard
precondition: multipass batch count is `ceil(cap / batchSize)`, and on Ollama
(`OLLAMA_BATCH_SIZE = 2`, 900s per-batch timeout) an unbounded cap is a scan that
never returns.

**#192 is the other precondition.** `MAX_LLM_EXCERPT_CHARS = 2048` and
`ANTHROPIC_MAX_OUTPUT_TOKENS = 4096` were calibrated for a local 7B on slow
hardware (commit `8410632`, "hybrid scan timeouts on slow hardware") and are
applied to every backend. A frontier model sees the first 2 KiB of every
candidate file regardless of its context window; the `anthropic` backend
truncates its response at 4096 output tokens. Make the excerpt budget
per-backend (Ollama keeps 2048, the rest bounded only by the 32 KiB read cap)
and raise the Anthropic output cap. ~0.5d.

**#166 + #192 → #167.**

### F2 attractiveness backlog (filed under #61)

Parent plan: [`USAGE_RECONCILIATION_PLAN.md`](../design/USAGE_RECONCILIATION_PLAN.md).  
Epic **#61** — Wave A (#85–#88) and Wave B (#89–#94) closed; Wave C + Parallel remain. Implement with `TF#<n>-…` branches.

#### Wave A — Manual reconciliation (done)

| Issue | Title | Extends |
| --- | --- | --- |
| #85 | Prove: usage CSV/JSON import UX (FinOps export → `UsageMetrics`) | #27 |
| #86 | Prove: baseline + after-Fix period compare (usage + scan) | #27 |
| #87 | Prove: freeze Assumptions snapshot with a compare run | #17 / #27 |
| #88 | Docs + demo: one-team pilot runbook (baseline → apply → import bill) | #23 / #61 |

Pilot path: [`PILOT_RUNBOOK.md`](../runbooks/PILOT_RUNBOOK.md).

#### Wave B — Live sync + variance (done)

| Issue | Title | Extends |
| --- | --- | --- |
| #89 | Prove port: `UsageProvider` interface + fixture adapter | #27 |
| #90 | CLI/Prove: first enterprise usage adapter (Copilot or org default) | #27 |
| #91 | CLI/Prove: Cursor usage adapter | #27 |
| #92 | CLI/Prove: Claude / Codex usage adapter (as APIs allow) | #27 |
| #93 | Prove: variance board (BU + team) + period picker | #27 / #18 |
| #94 | Prove: scheduled / on-demand usage sync | #27 |

#### Wave C — Attribution & calibration (next)

| Issue | Title | Extends |
| --- | --- | --- |
| #95 | CLI: apply/org-pack writes Prove change marker | #28 / #27 |
| #96 | Prove: cohort compare (Fix-on vs control) | #61 |
| #97 | Prove: auto-suggest `realizedWasteShare` from variance history | #17 / #27 |
| #98 | Pitch/FAQ: estimate vs actual honesty + pilot KPI card | #24 |

#### Parallel (#28 remaining)

| Issue | Title | Extends |
| --- | --- | --- |
| #99 | Remote org content-exclusion / policy apply API (per provider) | #28 |
| #100 | Org pilot pack: scan → apply → prove variance (single path) | #28 / #27 |

### F4 — Extension session Prove & provider CLI transports (#156)

Session savings that survive closed tabs + provider CLI / agent-CLI hooks beyond
F1.1. **Not scheduled for implementation until prioritized.** Stories are GitHub
sub-issues of #156.

| Issue | Title | Focus |
| --- | --- | --- |
| #157 | Extension: session ledger (cumulative tokens avoided) | Session avoided ≠ live at-risk |
| #158 | Extension: filtered-history panel (survives tab close) | Paths + tokens after close |
| #159 | Extension: durable Filter decisions (opt-in, workspace) | Persist Filter across reopen |
| #160 | Extension: session summary export for Prove | `.tokenforge/` handoff |
| #161 | CLI: additional provider CLI enricher (beyond Claude Code) | Transport parity; not #145 |
| #162 | CLI/DevEx: TokenForge callable from agent CLIs (MCP or hooks) | scan/apply from agent workflows |
| #163 | Docs: index F4 in BOARD.md | **Done** — this map |

Build order when prioritized: **#157 + #158** first → #159 / #160 → (#161 ∥ #162).

### F5 — RTK-inspired native product patterns (#177)

Concepts borrowed from [rtk-ai/rtk](https://github.com/rtk-ai/rtk) **product patterns** — measurement, discovery, defaults, honest tiers — applied at TokenForge's layer (context policy + Prove), not runtime bash compression. **Not scheduled until prioritized.** Sub-issues of #177; label: `rtk-inspired`.

| Issue | Title | RTK analogue | Surface | Status |
| --- | --- | --- | --- | --- |
| #170 | Detect: discover missed savings opportunities | `rtk discover` | Extension / CLI | To-Do |
| #171 | Core: output-shape file classes (CI/test/build artifacts) | Command-family filters | `risk-core` | To-Do |
| #172 | Fix: lean-instruction compact-output snippets | `rtk test` / `rtk err` guidance | CLI adapters | To-Do |
| #173 | Prove: in-product honest savings tiers UI | “How savings work” dilution | Extension / dashboard | To-Do |
| #174 | Prove: adoption metrics (session + repo coverage) | `rtk session` | Extension / dashboard | To-Do |
| #175 | CLI: `tokenforge init` one-shot repo setup | `rtk init -g` | CLI | To-Do |
| #176 | Docs: index RTK-inspired backlog in BOARD.md | — | Docs | **Done** |

**Cross-refs (same ideas, already filed under F4):**

| F4 issue | Overlap |
| --- | --- |
| #157–#158 | Session ledger / history ≈ `rtk gain` cumulative savings |
| #160 | Session export feeds Prove tiers (#173) |
| #162 | Agent MCP/hooks ≈ `rtk init` install UX (different job: scan/apply, not bash rewrite) |

**Explicitly out of scope:** RTK proxy, bash command rewriting, claiming bill-% cuts from output compression alone.

Build order when prioritized: **#175** (`init`) and **#170** (discover) for fast DevEx wins → **#171** (classes) → **#172** (lean snippets) → **#173 + #174** (Prove UX); **#176** with this board-map update.

### F6 — AI-first complementary hybrid Detect (#199)

**AI-first complementary hybrid:** heuristic baseline + optional LLM semantic layer that must add distinct analysis when hybrid runs — without breaking repo correctness or replacing heuristic savings. Design lock: [`COMPLEMENTARY_HYBRID_SCAN.md`](../design/COMPLEMENTARY_HYBRID_SCAN.md).

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #200 | Design doc + cross-refs | Docs | **Done** |
| #201 | Policy safety gate for LLM excludes | `risk-core` | **Done** |
| #202 | B2 class-aware oversized source handling | `risk-core` / CLI | **Done** |
| #203 | Selective `.cursor/rules` walk | CLI | **Done** |
| #204 | Deterministic instruction bloat audit | `risk-core` / CLI | **Done** |
| #205 | `hybridDelta` + `instructionBudget` on scan JSON | `risk-core` / CLI | **Done** |
| #206 | Mandatory `analysisOverview` (Tier-2 backends) | `enrichers` | **Done** |
| #207 | Cursor `.cursorignore` candidates sidecar | CLI adapters | **Done** |
| #208 | Policy advisory block + richer synthesis | `risk-core` | **Done** |
| #209 | Complementarity acceptance test suite | CLI tests | **Done** |
| #210 | Dashboard hybrid delta + instruction stack | Dashboard | **Done** |
| #211 | Pitch FAQ + BOARD F6 index | Docs | **Done** |
| #189 | Codex full-repo audit + context index proposals | `enrichers` | **Done** |

Build order: **#200 → #201 → #202 → #203 → #204 → #205 → #206 → #207 → #208 → #209 → #210 → #211 → #189**

Automated complementarity: `cli/src/commands/scan/scan.hybrid.test.ts` (#209). Manual provider matrix: [`E2E_COMPLEMENTARY_HYBRID_TEST.md`](../testing/E2E_COMPLEMENTARY_HYBRID_TEST.md).

### F14 — Heuristic Fix: robust deterministic policy synthesis (#283)

**The path most packs come out of.** `synthesizeLeanInstructions` + `collapseExclusionPaths` run by default, in CI, as the hybrid over-budget fallback, and inside `@tokenforge/policy-adapters`. Design: [`HEURISTIC_FIX_DESIGN.md`](../design/HEURISTIC_FIX_DESIGN.md).

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #284 | Collapse to the deepest common directory | `risk-core` | **Done** |
| #285 | `keepDirs` guard against kept content | `risk-core` | **Done** |
| #286 | Apply attests kept directories | CLI | **Done** |
| #287 | Synthesized intro + Prefer roots | `risk-core` / CLI | **Done** |
| #288 | Do-not-load buckets by waste kind | `risk-core` | **Done** |
| #291 | Instruction-stack verdict, no counts | `risk-core` | **Done** |
| #289 | `over-collapse-app` control + fallback golden | Tests | **Done** |
| #290 | Design doc + BOARD F14 index | Docs | **Done** |
| #300 | `media` file class — assets flagged by shape, not size | `risk-core` | **Done** |
| #301 | Asset-tree density signal | `risk-core` / CLI | **Done** |

### F7 — Hybrid Fix: heuristic-routed LLM policy synthesis (#225)

**Fix must reduce instruction bleed** — complete managed policy text, not truncated reminders. Design: [`HYBRID_FIX_DESIGN.md`](../design/HYBRID_FIX_DESIGN.md).

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #226 | Design doc + BOARD F7 index | Docs | **Done** |
| #227 | Heuristic attention set for LLM routing | `risk-core` | **Done** |
| #228 | Tiered enrichment (local cap vs vendor full set) | CLI scan | **Done** |
| #229 | Configurable policy budget | `risk-core` / CLI | **Done** |
| #230 | PolicySynthesizerPort (cursor-cli apply) | `enrichers` | **Done** |
| #231 | `apply --mode hybrid` + config file | CLI | **Done** |
| #232 | Tests: attention set + hybrid apply | Tests | **Done** |
| #233 | Docs refresh for F7 | Docs | **Done** |
| #234 | Presentation hybrid script | Scripts | **Done** |

Build order: **#226 → #227 → #228 → #229 → #230 → #231 → #232 → #234 → #233**

Presentation: `npm run tokenforge:presentation-full` (see [`PRESENTATION_HYBRID_EVAL.md`](../runbooks/PRESENTATION_HYBRID_EVAL.md)); hybrid act uses `cursor-cli:composer-2.5`.

### F8 — Extension rebuild Wave A: Foundation (#237)

Integrated rebuild **wave 1** — packages, ShieldSession, brand, dual-view UX shell. **Start here.**

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #243 | packages/context-adapters — ProviderContextAdapter port | Core | To-Do |
| #244 | packages/policy-adapters — extract CLI Fix adapters | Core / CLI | To-Do |
| #245 | ShieldSession engine + provider auto-detect | Extension | To-Do |
| #246 | brand identity — icon, CSS, marketplace metadata | Extension | To-Do |
| #247 | Overview + Open tabs UX shell | Extension | To-Do |
| #248 | commands, menus, and status bar regroup | Extension | To-Do |
| #249 | EXTENSION_PRODUCT.md + BOARD F8 index | Docs | To-Do |

Build order: **#243 → #244 ∥ #245 (after #243) → #246 → #247 → #248 → #249**

### F9 — Extension rebuild Wave B: Real Shield (#238)

Real provider-native Shield (Cursor first). **Depends on F8.**

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #250 | CursorContextAdapter — cursorignore merge + blocklist | context-adapters | To-Do |
| #251 | Hard/Soft shield modes + ShieldSession wiring | Extension | To-Do |
| #252 | close tab on Hard shield + Shield all + Clean session | Extension | To-Do |
| #253 | Cursor hooks installer (opt-in) | Extension | To-Do |
| #254 | effectiveness badges + Overview footnote | Extension | To-Do |
| #255 | Copilot partial adapter | context-adapters | To-Do |
| #256 | Tests: Real Shield integration | Tests | To-Do |

Build order: **#250 → #251 → #252 ∥ #253 → #254 → #255 → #256**

### F10 — Extension rebuild Wave C: Session AI (#239)

Pre-prompt gate, task context pack, drift advisor. **Depends on F9.**

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #257 | configurable idle thresholds + proactive nudges | Extension | To-Do |
| #258 | context drift advisor (heuristics) | Extension | **Done** |
| #260 | pre-prompt gate command + Overview banner | Extension | **Done** |
| #262 | task context pack (LLM + Apply pack) | Extension | **Done** |
| #263 | Session AI Overview cards + status bar | Extension | To-Do |
| #265 | Tests: Session AI flows | Tests | To-Do |

Build order: **#257 → #258 → #260 → #262 → #263 → #265**

### F11 — Extension rebuild Wave D: Instructions & Fix in IDE (#240)

Live rules budget, compact rules Apply in IDE. **Depends on F8 #244; recommend after F9.**

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #259 | instruction watch + live rules budget meter | Extension | To-Do |
| #261 | continuous analyze on save (debounced) | Extension | To-Do |
| #264 | overlap radar Overview card | Extension | To-Do |
| #266 | compact rules dry-run webview + Apply | Extension | To-Do |
| #267 | Analyze rules UX + Overview Rules KPI | Extension | To-Do |
| #268 | Tests: Instructions & Fix in extension | Tests | To-Do |

Build order: **#259 → #261 → #264 → #266 → #267 → #268**

### F12 — Extension rebuild Wave E: Discover & advisory (#241)

Discover, MCP audit, smart excerpt. **Depends on F11.**

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #269 | Discover service (delta + heuristic rank) | Extension | **Done** |
| #270 | Discover LLM rank + Overview card | Extension | **Done** |
| #271 | MCP config audit | Extension | To-Do |
| #272 | smart excerpt command | Extension | To-Do |
| #273 | post-turn path logging hook (opt-in) | Extension | To-Do |
| #274 | monorepo scope hints in Discover | Extension | **Done** |
| #275 | Tests: Discover & advisory | Tests | To-Do |

Build order: **#269 → #270 → #271 → #272 → #273 → #274 → #275**

### F13 — Extension rebuild Wave F: Prove, docs & ship (#242)

Walkthrough, marketplace, product docs. **Depends on F8–F12.**

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #276 | AI-narrated session summary (optional LLM) | Extension | To-Do |
| #277 | external-send transparency coach | Extension | To-Do |
| #278 | walkthrough + first-run onboarding | Extension | To-Do |
| #279 | README + marketplace screenshots | Extension | To-Do |
| #280 | EXTENSION_PRODUCT complete + CONTEXT_GUARD refresh | Docs | To-Do |
| #281 | vsce package CI + marketplace publish prep | DevEx | To-Do |

Build order: **#277 → #276 → #278 → #279 → #280 → #281**

**Epic execution order:** F8 → F9 → F10 → F11 → F12 → F13 (one epic per delivery occasion).

### F15 — Extension AI-First: first-class local LLM judgment (#306)

E2E of the rebuilt Context Guard ([`E2E_EXTENSION_AI_TEST.md`](../testing/E2E_EXTENSION_AI_TEST.md)) showed **Lane B** (Shield → agent context) is real after [#305](https://github.com/JordyNicholas/TokenForge/pull/305), while **Lane A** (Extension → LLM) is still a single buried Analyze-rules call. Tab scoring stays heuristic. Sub-issues of #306.

| Issue | Title | Surface | Status |
| --- | --- | --- | --- |
| #307 | first-class Analyze rules UX (un-bury Lane A) | Extension | **Done** — PR #312 |
| #308 | sane local LLM default + cache so AI-on works | Extension | **Done** — PR #313 |
| #309 | task-aware context pack (LLM ranks open tabs) | Extension | **Done** |
| #310 | LLM overlap radar across instruction files | Extension | **Done** |
| #311 | Cloud AGENTS.md recipe + E2E/BOARD F15 index | Docs | **Done** — this map |

Build order: **#307 → #308 → #309 ∥ #310 → #311**. Discover LLM rank stays F12 #270.

### Further improvement candidates (not yet filed as issues)

Board-map only until the team promotes them to an epic/stories. Do not treat as
committed scope.

| Candidate | Surface | Why | Status |
| --- | --- | --- | --- |
| One-click Fix from the extension (`tokenforge apply`) | Extension | Detect → Fix without leaving the IDE | **Filed** — F11 #266 |
| Before/after scan snapshots under `.tokenforge/` | CLI / Prove | Local Prove without billing APIs | Open |
| Team rollup from many `last-scan` / session exports | Dashboard | Eng-manager Detect evidence | Open |
| Policy-pack drift check in CI vs last apply | CLI / CI | Catch reverted lean policy | Open |
| Richer heuristic classes (continue `HEURISTICS_AUDIT`) | Core | Fewer hybrid false needs | Open |
| Idle + active-session feedback UX (`activePaths`) | Extension | Explain protected-from-exclude paths | **Filed** — F10 #257, F9 #254 |
| Guided pilot mode (scan → apply → prove) | CLI / docs | Match [`PILOT_RUNBOOK.md`](../runbooks/PILOT_RUNBOOK.md) | Open |
| Assumption presets by vendor plan | Dashboard | Editable knobs, still not live billing | Open |

## Build order

MVP (done): E0 → E1 → E2 → E3 → E4 → E5.

Phase 2:

1. **F1** (#60) — complete (#45/#46/#66/#48 shipped)
   - **F1.1** (#145) — epic closed; `claude-code` CLI backend shipped and verified against the real binary. **#166** (enforce the 30-candidate cap as a named default — its cost premise was measured away) and **#167** (multi-pass, a recall bet at ~2 extra model calls/scan) remain as follow-on stories, #166 first
2. **F2** (#61) — epic closed; **Wave C (#95–#98)** attribution/calibration and remotes for **#28** (#99/#100) remain as follow-on stories. Detail: [`USAGE_RECONCILIATION_PLAN.md`](../design/USAGE_RECONCILIATION_PLAN.md)
3. **F3** (#62) — epic closed; advisory panels for **#25** / **#26** shipped; full assistants remain post-hackathon (do not pitch)
4. **F4** (#156) — filed; implement only when prioritized (#157/#158 first)
5. **F5** (#177) — RTK-inspired native patterns (#170–#175 open; #176 **Done**); cross-refs F4 above
6. **F6** (#199) — **Epics Finished** (#200–#211, #189); design: [`COMPLEMENTARY_HYBRID_SCAN.md`](../design/COMPLEMENTARY_HYBRID_SCAN.md)
7. **F7** (#225) — **Epics Finished** (#226–#234); design: [`HYBRID_FIX_DESIGN.md`](../design/HYBRID_FIX_DESIGN.md)
8. **F8–F13** (#237–#242) — **Extension Context Guard rebuild** (open); **execute F8 → F9 → F10 → F11 → F12 → F13** one wave at a time
9. **F15** (#306) — **Extension AI-First** (**Epics Finished** with #307–#311). Build: #307 → #308 → #309 ∥ #310 → #311
10. **Candidates** below — promote to issues when the team agrees scope (several filed under F8–F13)

Design: [`HYBRID_SCAN_DESIGN.md`](../design/HYBRID_SCAN_DESIGN.md) · Complementary hybrid (F6): [`COMPLEMENTARY_HYBRID_SCAN.md`](../design/COMPLEMENTARY_HYBRID_SCAN.md) · Prove gap plan: [`USAGE_RECONCILIATION_PLAN.md`](../design/USAGE_RECONCILIATION_PLAN.md) · Extension Detect: [`EXTENSION_CONTEXT_GUARD.md`](../adapters/EXTENSION_CONTEXT_GUARD.md).
