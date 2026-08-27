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

### F1.1 — Claude Code CLI backend (#145, complete)

Design: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md). Manual verification:
[`E2E_CLAUDE_CODE_ENRICH_TEST.md`](./E2E_CLAUDE_CODE_ENRICH_TEST.md).

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
| #166 | enrichers: cut the per-batch session prefix cost of `claude-code` | — |
| #167 | enrichers: run `claude-code` through the multi-pass pipeline | #166 in practice |

Both come out of the #148 verification pass. Each `claude -p` pays ~30K
cache-creation tokens for its session prefix before reading a single candidate,
and batches are stateless by design — so #166 measures whether `--resume` or a
larger batch recovers it. #167 would give `claude-code` the cross-batch context
Ollama already has via map → judge → reconcile, but it turns N calls into 1+N+1,
which multiplies exactly the cost #166 measures. **#166 first**, so #167 is
decided with the per-call cost known.

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
| #163 | Docs: index F4 in BOARD.md | This map |

Build order when prioritized: **#157 + #158** first → #159 / #160 → (#161 ∥ #162);
#163 with the board-map docs change.

### Further improvement candidates (not yet filed as issues)

Board-map only until the team promotes them to an epic/stories. Do not treat as
committed scope.

| Candidate | Surface | Why |
| --- | --- | --- |
| One-click Fix from the extension (`tokenforge apply`) | Extension | Detect → Fix without leaving the IDE |
| Before/after scan snapshots under `.tokenforge/` | CLI / Prove | Local Prove without billing APIs |
| Team rollup from many `last-scan` / session exports | Dashboard | Eng-manager Detect evidence |
| Policy-pack drift check in CI vs last apply | CLI / CI | Catch reverted lean policy |
| Richer heuristic classes (continue `HEURISTICS_AUDIT`) | Core | Fewer hybrid false needs |
| Idle + active-session feedback UX (`activePaths`) | Extension | Explain protected-from-exclude paths |
| Guided pilot mode (scan → apply → prove) | CLI / docs | Match [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md) |
| Assumption presets by vendor plan | Dashboard | Editable knobs, still not live billing |

## Build order

MVP (done): E0 → E1 → E2 → E3 → E4 → E5.

Phase 2:

1. **F1** (#60) — complete (#45/#46/#66/#48 shipped)
   - **F1.1** (#145) — epic closed; `claude-code` CLI backend shipped and verified against the real binary. **#166** (per-batch prefix cost) and **#167** (multi-pass) remain as follow-on stories, in that order
2. **F2** (#61) — epic closed; **Wave C (#95–#98)** attribution/calibration and remotes for **#28** (#99/#100) remain as follow-on stories. Detail: [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md)
3. **F3** (#62) — epic closed; advisory panels for **#25** / **#26** shipped; full assistants remain post-hackathon (do not pitch)
4. **F4** (#156) — filed; implement only when prioritized (#157/#158 first)
5. **Candidates** above — promote to issues/epic when the team agrees scope

Design: [`docs/HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) · Prove gap plan: [`docs/USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md) · Extension Detect: [`EXTENSION_CONTEXT_GUARD.md`](./EXTENSION_CONTEXT_GUARD.md).
