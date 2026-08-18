# TokenForge board map

Project: [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2)

Columns: **To-Do**, **In Progress**, **Ready for Review**, **Done**, **Epics Finished**.

## Epics

| Epic | Issue | Phase |
| --- | --- | --- |
| Foundation | #1 | E0 |
| Risk core & fixtures | #2 | E1 |
| CLI policy pack | #3 | E2 |
| ROI dashboard (React) | #4 | E3 |
| VS Code extension | #5 | E4 |
| Demo polish & pitch | #6 | E5 |
| Future / Phase 2 | #7 | Future |

## Stories

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
| #21 | Tabs + 15-min / high-risk rule | E4 |
| #22 | Status bar + panel + JSON export | E4 |
| #23 | Demo script + runbook | E5 |
| #24 | Pitch FAQ (vs Auto Memory) | E5 |
| #25 | Future: chat compaction | Future |
| #26 | Future: model routing | Future |
| #27 | Future: live usage metrics (per provider) | Future |
| #28 | Future: org policy/exclusion apply (per provider) | Future |
| #41 | Future: hybrid scan design + JSON scaffolding | Future |
| #42 | Future: risk-core candidate selection + merge | Future |
| #43 | Future: CLI LLM enricher port + hybrid orchestration | Future |
| #44 | Future: CLI Ollama enricher (local Qwen) | Future |
| #45 | Future: CLI OpenAI-compatible enricher | Future |
| #46 | Future: CLI Anthropic enricher | Future |
| #47 | Future: dashboard hybrid / LLM finding display | Future |
| #48 | Future: extension optional LLM enricher | Future |
| #49 | Future: pitch materials — hybrid scan FAQ + deck | Future / E5 |

## Build order

E0 → E1 → E2 → E3 → E4 → E5 (Future deferred).

Hybrid scan (Future): #41 → #42 → #43 → (#44 \| #45 \| #46) → #47 → #48; pitch #49.

Design: [`docs/HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md).
