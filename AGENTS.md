# TokenForge — agent / collaborator guide

## What this is

Enterprise **AI Coding FinOps** for metered AI coding agents / LLMs: Detect → Fix → Prove.
Logic is **provider-agnostic**; Fix applies findings through pluggable adapters.

Read first (full index: [`docs/README.md`](docs/README.md)):

1. [`docs/product/CONCEPT_BRIEF.md`](docs/product/CONCEPT_BRIEF.md) — locked product narrative (not Auto Memory)
2. [`docs/design/SOLUTION_DESIGN.md`](docs/design/SOLUTION_DESIGN.md) — stack + MVP design
3. [`docs/adapters/EXTENSION_CONTEXT_GUARD.md`](docs/adapters/EXTENSION_CONTEXT_GUARD.md) — VS Code Detect UX (Context Guard)
4. [`docs/design/EXTENSION_PRODUCT.md`](docs/design/EXTENSION_PRODUCT.md) — extension product & dual-view UX
5. [`docs/delivery/PROJECT_PR_WORKFLOW.md`](docs/delivery/PROJECT_PR_WORKFLOW.md) — Issues ↔ PRs ↔ board
6. [`docs/delivery/BOARD.md`](docs/delivery/BOARD.md) — epic/story map; F2 Prove attractiveness waves; F24 adoption
7. [`docs/design/USAGE_RECONCILIATION_PLAN.md`](docs/design/USAGE_RECONCILIATION_PLAN.md) — estimate vs actual usage (Wave A→C)
8. [`docs/runbooks/PILOT_RUNBOOK.md`](docs/runbooks/PILOT_RUNBOOK.md) — one-team baseline → apply → import bill
9. [`docs/runbooks/STANDARD_PILOT_KIT.md`](docs/runbooks/STANDARD_PILOT_KIT.md) — Director control-cohort pilot
10. [`docs/delivery/F24_REAL_WORLD_ADOPTION.md`](docs/delivery/F24_REAL_WORLD_ADOPTION.md) — real-world adoption & evidence

## Delivery rules

- Every change maps to an **existing Issue**.
- Branch: `TF#<n>-slug` (or `TOKENFORGE#<n>`).
- PR body must include `Closes #<n>` (automation will append if missing).
- PRs must be **green on CI** (`typecheck` + `test` + `build`) before merge.
  Run `npm run typecheck && npm test` locally first — CI is a backstop, not the
  first time anyone finds out.
- Board: To-Do → In Progress → Ready for Review → Done.
- Epics titled `[Epic] …` close into **Epics Finished**, not Done — including when the last child story closes.

## Stack

TypeScript everywhere: `packages/risk-core`, `cli/`, `extension/`, React `dashboard/`.

## Architecture

**Ports and adapters/Hexagonal Architecture.** `packages/risk-core` is the kernel (estimate, score, types).
Extension / CLI / dashboard are adapters. They integrate through the Token Risk
JSON file contract, not by calling each other. Provider file formats belong only
in CLI adapters.

Do **not** import VS Code, React, CLI frameworks, or vendor SDKs into `risk-core`.
Do **not** import across delivery surfaces (extension ↛ CLI ↛ dashboard).

Full write-up: [`docs/design/SOLUTION_DESIGN.md`](docs/design/SOLUTION_DESIGN.md#architecture).

## Provider independence

- Do **not** hard-wire product identity or `risk-core` to a single vendor (Copilot, Cursor, Claude, etc.).
- CLI Fix path uses **adapters**; MVP may implement one default adapter and stub others.
- Dashboard cost math uses editable assumptions, not a single vendor billing API.

## Honesty constraints

- Do not claim interception of any agent/LLM’s private context pipeline.
- Pitch Chat/Agent / metered AI-credit workflows, not unlimited completions metering.
- “30%” is scenario-based via the dashboard calculator.
- Default scan is heuristic (no AI). Optional hybrid enrichment uses local or external LLMs on a bounded candidate set — Codex hybrid stages a sanitized repo copy for a read-only audit instead of excerpt batching. See [`docs/design/HYBRID_SCAN_DESIGN.md`](docs/design/HYBRID_SCAN_DESIGN.md).

## Cursor Cloud / extension host

Cloud Agents and local Extension Development Hosts share the same rebuild gotcha. Manual E2E: [`docs/testing/E2E_EXTENSION_AI_TEST.md`](docs/testing/E2E_EXTENSION_AI_TEST.md).

- **Install:** `npm ci` (see `.cursor/environment.json`). Dashboard: `npm run dev -w @tokenforge/dashboard -- --host` on `:5173`.
- **Build the extension:** `npm run tokenforge:extension`.
- **Launch:** F5 → "Run Extension", **or** headless:

  ```bash
  code --extensionDevelopmentPath=/workspace/extension --disable-extensions --disable-workspace-trust /workspace
  ```

  The **Extension Development Host** is a second window. Headless `code --extensionDevelopmentPath` is the same binary path without the IDE GUI — do not assume a Cloud VM has a clickable F5.
- **Full quit/relaunch after every rebuild.** `Developer: Reload Window` does **not** reload a rebuilt extension host. Quit the host (and the headless `code` process) and start it again.
- **Ollama preflight (Lane A):** `curl -s http://127.0.0.1:11434/api/tags` must list the tag. Default when the user enables enrichment is `ollama:qwen2.5-coder:3b`. Ollama down → honest warning, heuristic Detect still works. CPU-only hosts: use `:3b` / `:1.5b` and `tokenforge.llmTimeout` 900+.
