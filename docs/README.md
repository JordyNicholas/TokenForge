# TokenForge documentation

**Status:** Locked  
**Scope:** Index of all project documentation by topic and audience.  
**Audience:** Everyone — start here before opening a random `.md`.  
**Companion:** [`DOC_PATTERN.md`](./DOC_PATTERN.md) · [`../AGENTS.md`](../AGENTS.md) · [`../README.md`](../README.md)

---

## Start here

| If you are… | Read |
| --- | --- |
| New collaborator / agent | [`../AGENTS.md`](../AGENTS.md) → [`product/CONCEPT_BRIEF.md`](./product/CONCEPT_BRIEF.md) → [`design/SOLUTION_DESIGN.md`](./design/SOLUTION_DESIGN.md) |
| Running the hackathon demo | [`runbooks/DEMO_RUNBOOK.md`](./runbooks/DEMO_RUNBOOK.md) |
| Full hybrid-eval presentation (extension + heuristic + hybrid) | [`runbooks/PRESENTATION_HYBRID_EVAL.md`](./runbooks/PRESENTATION_HYBRID_EVAL.md) |
| FinOps / pilot (estimate vs bill) | [`runbooks/PILOT_RUNBOOK.md`](./runbooks/PILOT_RUNBOOK.md) |
| Shipping a PR | [`delivery/PROJECT_PR_WORKFLOW.md`](./delivery/PROJECT_PR_WORKFLOW.md) |
| Extension (Context Guard) | [`design/EXTENSION_PRODUCT.md`](./design/EXTENSION_PRODUCT.md) → [`adapters/EXTENSION_CONTEXT_GUARD.md`](./adapters/EXTENSION_CONTEXT_GUARD.md) |
| Hybrid scan / LLM backends | [`design/COMPLEMENTARY_HYBRID_SCAN.md`](./design/COMPLEMENTARY_HYBRID_SCAN.md) → [`design/HYBRID_SCAN_DESIGN.md`](./design/HYBRID_SCAN_DESIGN.md) → [`adapters/LLM_ENRICHER_SETUP.md`](./adapters/LLM_ENRICHER_SETUP.md) |
| Hybrid Fix / LLM policy apply | [`design/HYBRID_FIX_DESIGN.md`](./design/HYBRID_FIX_DESIGN.md) |
| Heuristic Fix / deterministic policy text | [`design/HEURISTIC_FIX_DESIGN.md`](./design/HEURISTIC_FIX_DESIGN.md) |

---

## By folder

### [product/](./product/) — what TokenForge is

Category, buyer, positioning, competitive FAQ.

| Doc | Purpose |
| --- | --- |
| [CONCEPT_BRIEF.md](./product/CONCEPT_BRIEF.md) | Locked one-pager: AI Coding FinOps, Detect → Fix → Prove |
| [PITCH_FAQ.md](./product/PITCH_FAQ.md) | Judge/collaborator Q&A (vs Auto Memory, ~30%, hybrid scan) |

### [design/](./design/) — how it is built

Architecture, contracts narrative, audits, phased plans.

| Doc | Purpose |
| --- | --- |
| [SOLUTION_DESIGN.md](./design/SOLUTION_DESIGN.md) | Stack, ports & adapters, monorepo layout, JSON contract |
| [EXTENSION_PRODUCT.md](./design/EXTENSION_PRODUCT.md) | Context Guard product & UX (dual views, Shield, Lane A/B) |
| [COMPLEMENTARY_HYBRID_SCAN.md](./design/COMPLEMENTARY_HYBRID_SCAN.md) | F6 — AI-first complementary heuristic + LLM layers, safety invariants |
| [HYBRID_FIX_DESIGN.md](./design/HYBRID_FIX_DESIGN.md) | F7 — heuristic-routed hybrid apply + policy synthesis |
| [HEURISTIC_FIX_DESIGN.md](./design/HEURISTIC_FIX_DESIGN.md) | F14 — the deterministic synthesizer: exclusion blast radius, synthesized policy text |
| [HYBRID_SCAN_DESIGN.md](./design/HYBRID_SCAN_DESIGN.md) | Heuristic + optional LLM enrichment (Phase 2 Detect) |
| [HEURISTICS_AUDIT.md](./design/HEURISTICS_AUDIT.md) | Point-in-time audit of default scan rules + fixture map |
| [USAGE_RECONCILIATION_PLAN.md](./design/USAGE_RECONCILIATION_PLAN.md) | Estimate vs actual usage (Prove Wave A→C) |

### [delivery/](./delivery/) — how we ship

| Doc | Purpose |
| --- | --- |
| [BOARD.md](./delivery/BOARD.md) | Epic/story map ↔ GitHub issues |
| [PROJECT_PR_WORKFLOW.md](./delivery/PROJECT_PR_WORKFLOW.md) | Branch naming, `Closes #n`, CI, board automation |

### [adapters/](./adapters/) — delivery surfaces

| Doc | Purpose |
| --- | --- |
| [EXTENSION_CONTEXT_GUARD.md](./adapters/EXTENSION_CONTEXT_GUARD.md) | VS Code Detect: dual views, Shield, Lane A/B, exports |
| [LLM_ENRICHER_SETUP.md](./adapters/LLM_ENRICHER_SETUP.md) | `--mode hybrid` backend setup (Ollama, Anthropic, CLIs) |
| [AGENT_MCP_SETUP.md](./adapters/AGENT_MCP_SETUP.md) | `tokenforge mcp` for Cursor / Claude Code agents |

### [runbooks/](./runbooks/) — operator scripts

| Doc | Purpose |
| --- | --- |
| [DEMO_RUNBOOK.md](./runbooks/DEMO_RUNBOOK.md) | ≤5 min live demo (Detect → Fix → Prove) |
| [PRESENTATION_HYBRID_EVAL.md](./runbooks/PRESENTATION_HYBRID_EVAL.md) | ~15 min hybrid-eval-app demo (extension → heuristic → hybrid) |
| [PILOT_RUNBOOK.md](./runbooks/PILOT_RUNBOOK.md) | One-team baseline → apply → import bill |
| [prove-monthly.md](./runbooks/prove-monthly.md) | Platform monthly `usage-sync` via GitHub Actions |

### [testing/](./testing/) — manual E2E verification

Non-deterministic LLM paths stay manual; heuristic paths are covered by `npm test`.

| Doc | Purpose |
| --- | --- |
| [E2E_HYBRID_SCAN_TEST.md](./testing/E2E_HYBRID_SCAN_TEST.md) | Hybrid scan end-to-end |
| [E2E_EXTENSION_AI_TEST.md](./testing/E2E_EXTENSION_AI_TEST.md) | Context Guard extension + Ollama Lane A/B |
| [E2E_ACTIVE_SESSION_TEST.md](./testing/E2E_ACTIVE_SESSION_TEST.md) | Active paths / session signal |
| [E2E_CLAUDE_CODE_ENRICH_TEST.md](./testing/E2E_CLAUDE_CODE_ENRICH_TEST.md) | Claude Code enricher backend |

### [pitch/](./pitch/) — deck & live Q&A

| Asset | Purpose |
| --- | --- |
| [TokenForge-Pitch.pptx](./pitch/TokenForge-Pitch.pptx) | Pitch deck |
| [PITCH_BOARD_PREP.md](./pitch/PITCH_BOARD_PREP.md) | Shark Tank–style spoken answers |
| [README.md](./pitch/README.md) | Regenerate deck, slide list |

### [schemas/](./schemas/) — JSON contracts

Formal Token Risk / usage / session schemas and example payloads.  
**Do not move** without updating `packages/risk-core` path constants and tests.

---

## Product spine (quick reference)

```text
DETECT (extension + CLI scan) → FIX (CLI apply/init) → PROVE (dashboard + usage sync)
         ↑                           ↑
    risk-core kernel          provider adapters
         └──────── JSON on disk (.tokenforge/*.json) ────────┘
```

---

## Docs vs code — known gaps

| Topic | Documentation | Code today |
| --- | --- | --- |
| Prove one-step | README `tokenforge:prove` | Shell/npm wrapper; no `tokenforge prove` subcommand |
| Session Prove on dashboard | F4 board (#156–#158) | Extension exports `session-stats.json`; dashboard loads via Source or `?session=` boot |
| Org policy remote push | `org-apply` docs in design | Staging only; Copilot manual, Cursor/Claude unsupported |
| Hybrid scan in CI | Explicitly excluded | See `design/HYBRID_SCAN_DESIGN.md` + `.github/workflows/ci.yml` |

Update this table when gaps close.
