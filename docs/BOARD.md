# TokenForge board map

Project: [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2)

Columns: **To-Do**, **In Progress**, **Ready for Review**, **Done**, **Epics Finished**.

Stories land in **Done** when they close. An `[Epic]` moves to **Epics Finished** when **all of its child stories are closed** (workflow auto-closes the epic). F1–F3 stay in **To-Do** until that happens.

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

Phase 2 (open). Former catch-all #7 was split:

| Epic | Issue | Phase |
| --- | --- | --- |
| F1 Hybrid Detect backends | #60 | Future |
| F1.1 Hybrid Detect — Claude Code CLI backend | #145 | Future |
| F2 Prove at org scale | #61 | Future |
| F3 Adjacent (do not pitch) | #62 | Future |

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
audited in [`HEURISTICS_AUDIT.md`](./HEURISTICS_AUDIT.md) — #108 (B8: `source`
files could not reach LLM candidate selection), #110 (B9: no reason code for
duplicated *logic*, only duplicated *instructions*), #112 (B10: no test seam, so
the hybrid merge/totals path only ever ran with zero findings). #114 above is the
fourth gap from the same run, left open by choice.

### Edge-case pass (#135–#137)

A second review, driven by ten `.json`-shaped cases where extension + size alone
give the wrong answer. Audited as B11–B15 in
[`HEURISTICS_AUDIT.md`](./HEURISTICS_AUDIT.md).

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

### F1.1 — Claude Code CLI backend (open, filed under #145)

Design: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md). Implement with
`TF#<n>-…` branches. Stories are GitHub sub-issues of #145.

| Issue | Title | Depends on |
| --- | --- | --- |
| #146 | core: register the `claude-code` enricher backend id (+ report schema enum) | — |
| #147 | CLI/enrichers: `claude-code` enricher adapter (Claude Code CLI, subscription login) + spec parse + registry + limits + `HYBRID_SCAN_DESIGN` / `LLM_ENRICHER_SETUP` docs | #146 |
| #148 | CLI: wire `--llm claude-code` flags/help + scan integration tests + privacy gate + manual E2E doc | #147 |
| #149 | Extension: treat `claude-code` as an external enricher backend | #147 |
| #150 | Docs: index this epic in `BOARD.md` (this table) | — |

Build order: **#146 → #147 → (#148 ∥ #149)**. #150 is independent. The three
narrative docs originally bundled as one "docs" story now sit next to their code
(#147 for the design/setup pages, #148 for the E2E doc).

### F2 attractiveness backlog (filed under #61)

Parent plan: [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md).  
Epic **#61** — Wave A (#85–#88) and Wave B (#89–#94) closed; Wave C + Parallel remain. Implement with `TF#<n>-…` branches.

#### Wave A — Manual reconciliation (done)

| Issue | Title | Extends |
| --- | --- | --- |
| #85 | Prove: usage CSV/JSON import UX (FinOps export → `UsageMetrics`) | #27 |
| #86 | Prove: baseline + after-Fix period compare (usage + scan) | #27 |
| #87 | Prove: freeze Assumptions snapshot with a compare run | #17 / #27 |
| #88 | Docs + demo: one-team pilot runbook (baseline → apply → import bill) | #23 / #61 |

Pilot path: [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md).

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

## Build order

MVP (done): E0 → E1 → E2 → E3 → E4 → E5.

Phase 2:

1. **F1** (#60) — complete (#45/#46/#66/#48 shipped)
   - **F1.1** (#145) — open. `claude-code` CLI backend: #146 → #147 → (#148 ∥ #149); #150 (this board index) independent
2. **F2** (#61) — thin demo slices for **#27** / **#28** shipped; **Wave A (#85–#88)** and **Wave B (#89–#94)** closed. **Next:** Wave C (#95–#98) attribution/calibration; remotes for **#28** (#99/#100) can run in parallel. Detail: [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md)
3. **F3** (#62) — advisory panels for **#25** / **#26** shipped; full assistants remain post-hackathon (do not pitch)

Design: [`docs/HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) · Prove gap plan: [`docs/USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md).
