# Solution Design Lite — TokenForge

**Status:** Locked  
**Scope:** Stack, ports & adapters, monorepo layout, JSON contract.  
**Audience:** Implementers and reviewers.  
**Companion:** [`CONCEPT_BRIEF.md`](../product/CONCEPT_BRIEF.md) · [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) · [`../schemas/`](../schemas/)

---

## Stack (confirmed)

| Piece | Choice |
| --- | --- |
| Dashboard | **React** (Vite) |
| CLI | **TypeScript** |
| Extension | **TypeScript** (VS Code Extension API) |
| Shared helpers | `packages/risk-core` (TypeScript) |
| Package manager | npm workspaces (default) |
| Demo ROI math | Transparent assumptions panel (tokens → $ / AI credits) |

## Product spine

```text
DETECT (extension) → FIX (CLI adapters) → PROVE (dashboard)
```

Shared contract: Token Risk events / scan reports as JSON (see schema below).
Detect + Prove are **provider-agnostic**. Fix applies findings through a **provider adapter**.

## Architecture

TokenForge is **ports and adapters** (hexagonal), not a hosted platform and not
microservices. There is no MVP API server, database, or message bus. Three local
delivery surfaces share one domain library and one JSON document.

**Kernel (the hexagon)** — `packages/risk-core`. Token estimate, risk score, and
shared types. Core must not import VS Code, React, Node CLI frameworks, or a
vendor SDK. Scoring does not depend on `provider`.

**Ports** — what the kernel and the three surfaces agree on without knowing a UI
or a vendor:

| Port | Role |
| --- | --- |
| Token Risk JSON (below) | Integration contract. Findings, totals, and `provider` as **data**. Written by Detect/Fix; read by Prove. |
| Provider-adapter interface (CLI) | Fix-out port. Same findings → vendor-native instruction/exclusion files. |
| LLM-enricher interface (CLI) | Optional Detect enrichment. Heuristic findings + semantic LLM findings → merged report. |
| UsageProvider interface (CLI) | Prove usage in-port. `fetchUsage({ org, period, teamScope }) → UsageMetrics`. Fixture/file first; live vendor adapters later. Dashboard stays vendor-blind. |

Surfaces do **not** call each other at runtime. They pass a file
(`.tokenforge/scan-report.json`, `.tokenforge/last-scan.json`). That is
file-based integration, not RPC or events.

**Adapters (the edges)** — one runtime per side of the hexagon:

| Adapter | Direction | Runtime |
| --- | --- | --- |
| Extension (Context Guard) | Detect in | VS Code extension host |
| CLI + provider adapters | Fix out | Node |
| CLI + LLM enrichers | Detect enrich (optional) | Node — local or external model |
| CLI + UsageProvider adapters | Prove usage in (Wave B) | Node — fixture now; live vendors later |
| Dashboard (Tokens Saved) | Prove out | React / Vite |

Dependency rule: **consumers → core**, never the reverse, and never
extension ↔ CLI ↔ dashboard. Copilot / Cursor / Claude mapping is allowed only
in CLI adapters. Dashboard cost knobs are assumption inputs, not a billing API.

The **pipeline** `DETECT → FIX → PROVE` is the product journey, not a runtime
bus. `risk-core` is a **shared kernel** (one scoring model reused by three
processes). `fixtures/noisy-app` is a demo repo the CLI scans — not a package
and not an adapter.

```text
                    ┌─────────────────────┐
                    │  packages/risk-core │  kernel
                    │  estimate + score   │
                    └──────────┬──────────┘
           ┌───────────────────┼───────────────────┐
           ▼                   ▼                   ▼
     extension            cli + adapters       dashboard
     Detect in              Fix out             Prove out
           │                   │                   │
           └──────── JSON port (files on disk) ────┘
```

## Monorepo layout

```text
TokenForge/
├── docs/                   # see docs/README.md — product, design, delivery, …
│   ├── product/
│   ├── design/
│   ├── delivery/
│   ├── adapters/
│   ├── runbooks/
│   ├── testing/
│   ├── pitch/
│   └── schemas/            # JSON contracts (code-embedded paths)
├── packages/risk-core/     # estimateTokens, scoreRisk, types
│   └── src/{domain,classify,estimate,score,report}/
├── packages/enrichers/     # hybrid LLM backends
├── fixtures/               # see fixtures/README.md for the full catalog
│   ├── noisy-app/          # demo repo with lockfiles / fat configs
│   ├── lean-app/           # negative control: healthy repo, no findings
│   ├── borderline-app/     # precision stress test: legit large files
│   ├── instructions-app/   # hybrid/LLM candidate-selection fixture
│   └── expected/           # pinned scan totals per fixture
├── extension/              # VS Code Context Guard
├── cli/                    # tokenforge scan | apply | init | usage-sync | mcp
│   └── src/{app,commands,adapters,usage,io,output,savings}/
└── dashboard/              # React ROI UI
    └── src/{domain,data,state,pages,ui}/
```

## JSON contract

Formal schema (shared by CLI scan-report, extension last-scan export, and dashboard loader):
[`docs/schemas/risk-event.schema.json`](./schemas/risk-event.schema.json)
(`$id`: `https://tokenforge.dev/schema/risk-event/v5`).
Example document: [`docs/schemas/examples/scan-report.v0.json`](./schemas/examples/scan-report.v0.json).

Each version is a **strict superset** of the one before, so a report written by an
older surface still validates against the live schema — the reverse does not hold.
Every predecessor is frozen beside it as `risk-event.v<N>.schema.json`, and the
per-version deltas are recorded where the field was introduced:
[`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) and
[`HEURISTICS_AUDIT.md`](./HEURISTICS_AUDIT.md).

The `$id` above is the **only** place this document names a version, and a
`risk-core` test asserts it matches `TOKEN_RISK_REPORT_SCHEMA_ID`. Prose that
enumerates the newest delta is what went stale across three bumps before.

```json
{
  "source": "extension|cli",
  "timestamp": "ISO-8601",
  "repo": "org/name-or-local",
  "team": "payments-platform",
  "provider": "copilot|cursor|claude|generic",
  "findings": [
    {
      "path": "package-lock.json",
      "reason": "inactive_tab|high_risk_filetype|oversized",
      "bytes": 2400000,
      "estTokens": 600000,
      "action": "filtered|excluded|kept"
    }
  ],
  "totals": {
    "beforeTokens": 820000,
    "afterTokens": 210000,
    "savedTokens": 610000
  }
}
```

`provider` records which Fix adapter produced (or will produce) policy files; risk scoring does not depend on it.

Hackathon token estimate: `estTokens ≈ ceil(bytes / 4)` unless replaced by a tokenizer later.

## “30%” definition

On the **demo fixture** (not a universal production claim):

\[
\text{savings \%} = (beforeTokens - afterTokens) / beforeTokens
\]

Dashboard converts tokens → $ via editable assumptions (rate, team size, msgs/day). Assumptions are vendor-neutral; live billing sync is Phase 2 per provider.

## Component briefs

### Extension — Context Guard

- Track open editors: path, size, last focus/edit, filetype class
- Rule: inactive ≥10 minutes (focused) / ≥5 minutes (background) **or** high-risk class → at-risk
- UX: status bar + side panel (Keep / Filter) + Risk pulse; see [`EXTENSION_CONTEXT_GUARD.md`](../adapters/EXTENSION_CONTEXT_GUARD.md)
- Export `.tokenforge/last-scan.json` or `~/.tokenforge/events.jsonl`
- Honesty: recommended hygiene / risk scoring — not interception of any agent’s private pipeline
- Optional: `tokenforge.autoFilterHighRisk` auto-Filters pending lockfile/generated tabs

### CLI — `tokenforge`

```bash
tokenforge scan [--mode heuristic|hybrid] [--llm <backend>:<model>]
tokenforge apply [--provider <id>] [--dry-run]
tokenforge init   # scan + apply + report
```

Default scan is **heuristic-only** (fast, offline, deterministic). Optional
`--mode hybrid` runs the same baseline plus an **LLM enricher** on a bounded
candidate set (instruction files, borderline configs, top-N largest paths).
Enrichers are pluggable (`noop`, `ollama`, `codex`, `anthropic`). Full design:
[`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md).

`apply` / `init` select a **provider adapter** that maps the same scan findings to that vendor’s levers, for example:

| Adapter id | Example outputs (illustrative) |
| --- | --- |
| `copilot` (MVP default OK) | merge lean section into `.github/copilot-instructions.md` (`<!-- tokenforge:begin/end -->`) + exclusion candidates |
| `cursor` | merge lean section into `.cursor/rules/tokenforge.mdc` + ignore candidates |
| `claude` / `codex` | merge lean section into `CLAUDE.md` + ignore candidates |
| `generic` | merge lean section into `.github/tokenforge-instructions.md` + vendor-neutral exclusions |

Always also write `.tokenforge/scan-report.json` (agnostic contract).

MVP may implement one adapter fully and stub others; do not hard-code a single vendor into `risk-core` or the dashboard.

### Dashboard — Tokens Saved (React)

- BU overview, team heatmap, findings (detail drawer + copy-only advice), assumptions panel
- Load seeded demo data + optional CLI/extension JSON
- Cost knobs are generic (rate / credits / msgs), not a single vendor’s billing API

## Build order

1. Foundation + risk-core + noisy fixture  
2. CLI (scan + at least one Fix adapter)  
3. Dashboard  
4. Extension  
5. Demo polish / pitch  

## Phase 2 (board: Future)

Hybrid scan (local **and** external LLM enrichers), chat history compaction,
intelligent model routing, live usage/billing sync **per provider**,
org-level exclusion/policy apply APIs — do **not** lead the pitch with these.
Hybrid scan design: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md).

**Prove attractiveness (estimate vs actual):** thin usage import is shipped under
#27; Wave A is the manual reconcile path (import bill, period compare, freeze,
[`PILOT_RUNBOOK.md`](../runbooks/PILOT_RUNBOOK.md)). Wave B is live adapters + variance board;
Wave C is attribution / calibration — epic #61. Action plan:
[`USAGE_RECONCILIATION_PLAN.md`](./USAGE_RECONCILIATION_PLAN.md) ·
[`BOARD.md`](../delivery/BOARD.md).
