# TokenForge

Enterprise **AI Coding FinOps** — cost & token optimiser for large IT organisations, independent of which coding agent / LLM teams use.

TokenForge helps teams cut “token bleed” in developer workflows: detect high-cost, low-value IDE/repo context, apply **provider-native** lean instructions and exclusions via adapters, and prove tokens/$ saved to engineering managers.

> **Category:** AI Coding FinOps — not assistant memory.

## Links

| Resource | URL |
| --- | --- |
| **Documentation index** | [`docs/README.md`](docs/README.md) |
| Project board | [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2) |
| Epic / story map | [`docs/delivery/BOARD.md`](docs/delivery/BOARD.md) |
| Concept brief | [`docs/product/CONCEPT_BRIEF.md`](docs/product/CONCEPT_BRIEF.md) |
| Solution design | [`docs/design/SOLUTION_DESIGN.md`](docs/design/SOLUTION_DESIGN.md) (architecture: [ports & adapters](docs/design/SOLUTION_DESIGN.md#architecture)) |
| Hybrid scan design (Phase 2) | [`docs/design/HYBRID_SCAN_DESIGN.md`](docs/design/HYBRID_SCAN_DESIGN.md) |
| E2E hybrid scan test | [`docs/testing/E2E_HYBRID_SCAN_TEST.md`](docs/testing/E2E_HYBRID_SCAN_TEST.md) |
| E2E active session test | [`docs/testing/E2E_ACTIVE_SESSION_TEST.md`](docs/testing/E2E_ACTIVE_SESSION_TEST.md) |
| Pitch FAQ (vs Auto Memory) | [`docs/product/PITCH_FAQ.md`](docs/product/PITCH_FAQ.md) |
| Demo runbook (≤5 min script) | [`docs/runbooks/DEMO_RUNBOOK.md`](docs/runbooks/DEMO_RUNBOOK.md) |
| One-team pilot (estimate vs imported bill) | [`docs/runbooks/PILOT_RUNBOOK.md`](docs/runbooks/PILOT_RUNBOOK.md) |
| Context Guard (extension) | [`docs/design/EXTENSION_PRODUCT.md`](docs/design/EXTENSION_PRODUCT.md) · [`docs/adapters/EXTENSION_CONTEXT_GUARD.md`](docs/adapters/EXTENSION_CONTEXT_GUARD.md) |
| Pitch deck | [`docs/pitch/TokenForge-Pitch.pptx`](docs/pitch/TokenForge-Pitch.pptx) |
| PR ↔ board workflow | [`docs/delivery/PROJECT_PR_WORKFLOW.md`](docs/delivery/PROJECT_PR_WORKFLOW.md) |
| Collaborator guide | [`AGENTS.md`](AGENTS.md) |

## Core loop

**Token Risk → Policy Pack → Savings Proof**

Detect and Prove are provider-agnostic. Fix uses pluggable adapters (Copilot, Cursor, Claude/Codex, generic, …).

## MVP

| Component | Path | Role |
| --- | --- | --- |
| VS Code extension | `extension/` | Score & filter inactive / high-risk tabs (10m focused / 5m background) |
| CLI (TypeScript) | `cli/` | One-click repo optimisation (adapter instructions + exclusions + estimate) |
| ROI dashboard (React) | `dashboard/` | Mock “tokens saved” analytics across a business unit |
| Shared risk helpers | `packages/risk-core/` | Token estimate + risk scoring types |

## Delivery

- Issues + Epics on the project board (phases E0–E5, Future)
- Branch `TF#<issue>` → PR with `Closes #<n>` → auto-close on merge
- Board automation mirrors Flux (see `docs/delivery/PROJECT_PR_WORKFLOW.md`)

## Development

```bash
npm install
```

npm workspaces: `packages/*`, `cli`, `dashboard`, `extension`. Shared TypeScript
options live in `tsconfig.base.json`. `packages/risk-core` is the shared kernel.
The CLI can scan a repo; the dashboard is the React Prove adapter; the
extension is the VS Code Detect adapter (Context Guard scaffold).

```bash
npm run typecheck
npm test
npm run tokenforge:scan
```

`tokenforge:scan` / `:apply` / `:init` are **demo shortcuts** hardcoded to
`fixtures/noisy-app`. For any other path (or hybrid flags), use the flexible
entry:

```bash
npm run tokenforge -- scan path/to/repo
npm run tokenforge -- init path/to/repo --mode hybrid --llm ollama:qwen2.5-coder:7b
```

Pass the editor's open files so Fix never proposes excluding one of them:

```bash
npm run tokenforge -- scan path/to/repo --active-paths-file .tokenforge/last-scan.json
```

The extension writes every open tab into that report's `activePaths`. A listed
path is still reported (with its real risk) but downgraded to `kept`, so its
tokens stop counting as saved and no exclusion artifact names it. Not
auto-detected — a stale export would silently protect files nobody has open any
more. Runbook: [`docs/testing/E2E_ACTIVE_SESSION_TEST.md`](docs/testing/E2E_ACTIVE_SESSION_TEST.md).

`tokenforge scan` scores paths with risk-core, prints a findings table, and writes
`.tokenforge/scan-report.json` (v0 Token Risk contract). Default mode is
**heuristic-only** (no AI). Optional hybrid enrichment is documented in
[`docs/design/HYBRID_SCAN_DESIGN.md`](docs/design/HYBRID_SCAN_DESIGN.md). Extra flags:

```bash
npm run tokenforge:scan -- --json
npm run tokenforge:scan -- --mode hybrid
npm run tokenforge -- scan path/to/repo --mode hybrid --llm ollama:qwen2.5-coder:7b
```

Local Ollama test (requires `qwen2.5-coder:7b` or your model tag):

```bash
npm run tokenforge -- scan fixtures/noisy-app --mode hybrid --llm ollama:qwen2.5-coder:7b
```

```bash
npm run tokenforge:apply -- --dry-run
npm run tokenforge:init
npm run tokenforge -- init path/to/repo --mode hybrid --provider generic
```

`apply` / `init` write a **provider adapter** pack into each vendor’s
**conventional** instruction path (MVP default: Copilot
`.github/copilot-instructions.md` + TokenForge-named exclusion candidates).
Instruction markdown uses a managed HTML-comment section
(`<!-- tokenforge:begin -->` … `<!-- tokenforge:end -->`): create the file when
missing; if it already exists, keep user text outside the markers and only
insert/update the TokenForge block (so policies land where the agent actually
reads). The lean body is **synthesized from the combined scan report**
(heuristic + optional LLM findings/themes), not a fixed template — still
byte-capped so the TokenForge section cannot become another fat always-on dump.
Cursor / Claude / generic adapters use the same merge for their instruction
paths (`.cursor/rules/tokenforge.mdc`, `CLAUDE.md`, …). Org-scale apply is local
`tokenforge org-pack` aggregation — not a vendor org API. `init` forwards
`--mode` / `--llm` into the scan step (same as `scan`).

`--json` prints machine totals (`beforeTokens`, `afterTokens`, `savedTokens`,
`savedPercent`) for demo scripts and the dashboard seed. Human output includes
the same percent (one decimal). Exit `0` when `savedTokens > 0`, `3` when a scan
completes with no savings, `2` for usage errors.

Pinned noisy-app numbers: [`fixtures/expected/noisy-app-totals.json`](fixtures/expected/noisy-app-totals.json).

```bash
npm run tokenforge:dashboard
```

Serves the Tokens Saved layout (Overview, Heatmap, Offenders, Assumptions).
Assumptions convert token totals → $ live (rate, team size, msgs/day, model
mix). The pitch ~30% is that scenario on `dashboard/public/demo-seed.json`
(offline). Optionally load a CLI/extension `scan-report.json` via file or URL,
or boot with `?src=/last-scan.json`.

**Detect → Prove in one step** (heuristic or hybrid):

```bash
npm run tokenforge:prove -- scan fixtures/noisy-app
npm run tokenforge:prove -- scan path/to/repo --mode hybrid --llm ollama:qwen2.5-coder:7b
```

Runs the CLI, stages `.tokenforge/scan-report.json` as
`dashboard/public/last-scan.json`, starts the dashboard if needed, and opens
`/board/combined?src=/last-scan.json`.

```bash
npm run tokenforge:dashboard:build
npm run tokenforge:dashboard:preview
```

```bash
npm run tokenforge:extension
```

Builds `extension/dist/extension.js` (bundles `@tokenforge/risk-core` for the
extension host). Open the repo root in VS Code or Cursor, run **Run Extension**
(F5), then open the **TokenForge** activity bar: **Overview** + **Open tabs**,
Shield/Allow, and auto-exported `.tokenforge/last-scan.json`.

```bash
npm run tokenforge:extension:watch
```

Rebuilds on save while the watch task is running (used by `.vscode/launch.json`).

**Monthly Prove (Platform):** [`.github/workflows/prove-monthly.yml`](.github/workflows/prove-monthly.yml)
runs scheduled + manual `usage-sync` (optional heuristic `scan`) and uploads
`.tokenforge/` artifacts — no surprise commits. Operator guide:
[`docs/runbooks/prove-monthly.md`](docs/runbooks/prove-monthly.md).

## Board automation setup

Exact GitHub UI steps (secret, delete-head-branches, Project workflows):
[`docs/delivery/PROJECT_PR_WORKFLOW.md`](docs/delivery/PROJECT_PR_WORKFLOW.md#collaborator-setup-github-ui).

Repository secret **`PROJECT_TOKEN`** (PAT with Projects:write) is required for
board Status sync. Issue auto-link via `Closes #` still works without it. Reuse
the Flux PAT if it already has Projects:write on JordyNicholas user projects.
