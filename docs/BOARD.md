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
| F2 Prove at org scale | #61 | Future |
| F3 Adjacent (do not pitch) | #62 | Future |

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
| #27 | Live usage metrics / billing sync (per provider) | F2 #61 | **Thin slice shipped:** demo/file usage import in Prove (not live vendor APIs). **Remaining:** Waves A–C in [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md) |
| #28 | Apply org content exclusions / policy (per provider) | F2 #61 | **Thin slice shipped:** `tokenforge org-pack` + Cursor/Claude adapters (local files; not org API push). **Remaining:** remote org apply APIs + pilot pack path |
| #25 | Chat history compaction assistant | F3 #62 | **Thin slice shipped:** advisory panel on Overview (do not pitch first) |
| #26 | Intelligent model routing | F3 #62 | **Thin slice shipped:** advisory panel + Assumptions hint (do not pitch first) |

#49 (hybrid pitch FAQ + deck) closes with the board-map docs PR. Context Guard auto-filter and the 10m/5m idle rule landed on `main` after #22 without a separate story. Exec-board pitch refresh + per-team Prove landed with the F2/F3 thin slices above.

### F2 attractiveness backlog (filed under #61)

Parent plan: [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md).  
Epic **#61 reopened**; stories below are sub-issues. Implement Wave A first (`TF#85-…` etc.).

#### Wave A — Manual reconciliation

| Issue | Title | Extends |
| --- | --- | --- |
| #85 | Prove: usage CSV/JSON import UX (FinOps export → `UsageMetrics`) | #27 |
| #86 | Prove: baseline + after-Fix period compare (usage + scan) | #27 |
| #87 | Prove: freeze Assumptions snapshot with a compare run | #17 / #27 |
| #88 | Docs + demo: one-team pilot runbook (baseline → apply → import bill) | #23 / #61 |

Pilot path: [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md).

#### Wave B — Live sync + variance

| Issue | Title | Extends |
| --- | --- | --- |
| #89 | Prove port: `UsageProvider` interface + fixture adapter | #27 |
| #90 | CLI/Prove: first enterprise usage adapter (Copilot or org default) | #27 |
| #91 | CLI/Prove: Cursor usage adapter | #27 |
| #92 | CLI/Prove: Claude / Codex usage adapter (as APIs allow) | #27 |
| #93 | Prove: variance board (BU + team) + period picker | #27 / #18 |
| #94 | Prove: scheduled / on-demand usage sync | #27 |

#### Wave C — Attribution & calibration

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
2. **F2** (#61, reopened) — thin demo slices for **#27** / **#28** shipped; **Wave A (#85–#88)** is the manual estimate vs imported bill path ([`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md)), then Wave B (#89–#94), then Wave C (#95–#98). Remotes for **#28** (#99/#100) can overlap Wave B once Wave A is demoable. Detail: [`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md)
3. **F3** (#62) — advisory panels for **#25** / **#26** shipped; full assistants remain post-hackathon (do not pitch)

Design: [`docs/HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) · Prove gap plan: [`docs/USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md).
