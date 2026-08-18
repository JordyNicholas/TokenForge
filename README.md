# TokenForge

Enterprise **AI Coding FinOps** — cost & token optimiser for large IT organisations, independent of which coding agent / LLM teams use.

TokenForge helps teams cut “token bleed” in developer workflows: detect high-cost, low-value IDE/repo context, apply **provider-native** lean instructions and exclusions via adapters, and prove tokens/$ saved to engineering managers.

> **Category:** AI Coding FinOps — not assistant memory.

## Links

| Resource | URL |
| --- | --- |
| Project board | [TokenForge — Hackathon Board](https://github.com/users/JordyNicholas/projects/2) |
| Epic / story map | [`docs/BOARD.md`](docs/BOARD.md) |
| Concept brief | [`docs/CONCEPT_BRIEF.md`](docs/CONCEPT_BRIEF.md) |
| Solution design | [`docs/SOLUTION_DESIGN.md`](docs/SOLUTION_DESIGN.md) (architecture: [ports & adapters](docs/SOLUTION_DESIGN.md#architecture)) |
| Hybrid scan design (Phase 2) | [`docs/HYBRID_SCAN_DESIGN.md`](docs/HYBRID_SCAN_DESIGN.md) |
| E2E hybrid scan test | [`docs/E2E_HYBRID_SCAN_TEST.md`](docs/E2E_HYBRID_SCAN_TEST.md) |
| Pitch FAQ (vs Auto Memory) | [`docs/PITCH_FAQ.md`](docs/PITCH_FAQ.md) |
| Pitch deck | [`docs/pitch/TokenForge-Pitch.pptx`](docs/pitch/TokenForge-Pitch.pptx) |
| PR ↔ board workflow | [`docs/PROJECT_PR_WORKFLOW.md`](docs/PROJECT_PR_WORKFLOW.md) |
| Collaborator guide | [`AGENTS.md`](AGENTS.md) |

## Core loop

**Token Risk → Policy Pack → Savings Proof**

Detect and Prove are provider-agnostic. Fix uses pluggable adapters (Copilot, Cursor, Claude/Codex, generic, …).

## MVP

| Component | Path | Role |
| --- | --- | --- |
| VS Code extension | `extension/` | Score & filter inactive / high-risk background tabs (≥15 min) |
| CLI (TypeScript) | `cli/` | One-click repo optimisation (adapter instructions + exclusions + estimate) |
| ROI dashboard (React) | `dashboard/` | Mock “tokens saved” analytics across a business unit |
| Shared risk helpers | `packages/risk-core/` | Token estimate + risk scoring types |

## Delivery

- Issues + Epics on the project board (phases E0–E5, Future)
- Branch `TF#<issue>` → PR with `Closes #<n>` → auto-close on merge
- Board automation mirrors Flux (see `docs/PROJECT_PR_WORKFLOW.md`)

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

`tokenforge scan` scores paths with risk-core, prints a findings table, and writes
`.tokenforge/scan-report.json` (v0 Token Risk contract). Default mode is
**heuristic-only** (no AI). Optional hybrid enrichment is documented in
[`docs/HYBRID_SCAN_DESIGN.md`](docs/HYBRID_SCAN_DESIGN.md). Extra flags:

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
```

`apply` / `init` write a **provider adapter** pack (MVP default: Copilot
`.github/copilot-instructions.md` + exclusion candidates). Cursor/Claude adapters
are stubbed; `--provider generic` writes a vendor-neutral pack.

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
(offline). Optionally load a CLI/extension `scan-report.json` via file or URL.

```bash
npm run tokenforge:dashboard:build
npm run tokenforge:dashboard:preview
```

```bash
npm run tokenforge:extension
```

Builds `extension/dist/extension.js` (bundles `@tokenforge/risk-core` for the
extension host). Open the repo root in VS Code or Cursor, run **Run Extension**
(F5), then in the Extension Development Host use Command Palette →
**TokenForge: Hello**. Tab scoring, status bar, and `.tokenforge/last-scan.json`
export are follow-on E4 stories (#21 / #22).

```bash
npm run tokenforge:extension:watch
```

Rebuilds on save while the watch task is running (used by `.vscode/launch.json`).

## Board automation setup

Exact GitHub UI steps (secret, delete-head-branches, Project workflows):
[`docs/PROJECT_PR_WORKFLOW.md`](docs/PROJECT_PR_WORKFLOW.md#collaborator-setup-github-ui).

Repository secret **`PROJECT_TOKEN`** (PAT with Projects:write) is required for
board Status sync. Issue auto-link via `Closes #` still works without it. Reuse
the Flux PAT if it already has Projects:write on JordyNicholas user projects.
