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

### Phase 2 — open

| Issue | Title | Epic | Order |
| --- | --- | --- | --- |
| #45 | CLI: OpenAI-compatible enricher | F1 #60 | 1a (∥ #46, #66) |
| #46 | CLI: Anthropic enricher | F1 #60 | 1b (∥ #45, #66) |
| #66 | CLI: multi-pass local-first LLM enrich (map → judge → reconcile) | F1 #60 | 1c (∥ #45, #46; Ollama-first) |
| #48 | Extension: optional LLM enricher | F1 #60 | 2 (after #45 or #46) |
| #27 | Live usage metrics / billing sync (per provider) | F2 #61 | 1 |
| #28 | Apply org content exclusions / policy (per provider) | F2 #61 | 2 |
| #25 | Chat history compaction assistant | F3 #62 | 1 (do not pitch) |
| #26 | Intelligent model routing | F3 #62 | 2 (do not pitch) |

#49 (hybrid pitch FAQ + deck) closes with the board-map docs PR. Context Guard auto-filter and the 10m/5m idle rule landed on `main` after #22 without a separate story.

## Build order

MVP (done): E0 → E1 → E2 → E3 → E4 → E5.

Phase 2:

1. **F1** (#60) — confirm #43/#44 closed → **#45 ∥ #46 ∥ #66** → **#48**
2. **F2** (#61) — **#27** → **#28** (after F1 if hybrid findings should show in org Prove)
3. **F3** (#62) — **#25** → **#26** (do not start while F1 is open; do not pitch)

Design: [`docs/HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md).
