# Quick start — one-shot repo setup

**Status:** Runbook  
**Scope:** First-time Detect → Fix on a single repo (`tokenforge init`).  
**Story:** [#175](https://github.com/JordyNicholas/TokenForge/issues/175) · Epic [#177](https://github.com/JordyNicholas/TokenForge/issues/177)

## Prerequisites

From the TokenForge monorepo root:

```bash
npm install
npm run build -w @tokenforge/cli
```

Or link the CLI globally if you prefer (`npm link -w @tokenforge/cli`).

## One command

```bash
tokenforge init /path/to/your/repo --provider copilot
```

What it does:

1. Creates `.tokenforge/` (scan reports, Prove handoff).
2. Appends `.tokenforge/` to `.gitignore` when a `.gitignore` file exists and does not already list it.
3. Runs an offline **heuristic** scan (default — no LLM, no network).
4. Writes provider policy files via the selected adapter (lean instructions + exclusion candidates).

### Provider flag

Pick the adapter that matches how your team uses Chat/Agent:

| `--provider` | Typical outputs |
| --- | --- |
| `copilot` (default for init) | `.github/copilot-instructions.md` + exclusions |
| `cursor` | `.cursor/rules/tokenforge.mdc` + ignore candidates |
| `claude` | `CLAUDE.md` + ignore candidates |
| `generic` | `.github/tokenforge-instructions.md` |

Scan-only (no policy write yet):

```bash
tokenforge init /path/to/your/repo --skip-apply
```

Dry-run (print planned writes, change nothing):

```bash
tokenforge init /path/to/your/repo --dry-run
```

## Optional hybrid scan

```bash
tokenforge init /path/to/your/repo --mode hybrid --llm ollama:qwen2.5-coder:7b
```

Hybrid mode sends bounded excerpts to the configured enricher. Use `--allow-external` when the backend leaves this machine.

## After init

| Next step | Command / surface |
| --- | --- |
| Re-scan after edits | `tokenforge scan` |
| Re-apply policy only | `tokenforge apply --provider <id>` |
| Org pilot (baseline → apply → Prove) | [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md) — `tokenforge pilot` |
| Agent CLI integration | `tokenforge mcp` (stdio MCP server; see F4 #162) |
| VS Code Context Guard | Install the TokenForge extension for live tab Detect |

## Honesty

`init` estimates context hygiene from repo shape and file sizes. It does **not** intercept any vendor Chat/Agent pipeline. Savings tiers and bill reconciliation live under Prove — see [`USAGE_RECONCILIATION_PLAN.md`](../design/USAGE_RECONCILIATION_PLAN.md).
