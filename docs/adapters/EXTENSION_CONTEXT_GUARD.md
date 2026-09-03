# Context Guard — VS Code extension

**Status:** Locked  
**Scope:** How the extension Detects, Shields, optionally calls an LLM, and exports Prove JSON.  
**Audience:** Extension developers and demo operators  
**Companion:** [`../design/EXTENSION_PRODUCT.md`](../design/EXTENSION_PRODUCT.md) · [`../testing/E2E_EXTENSION_AI_TEST.md`](../testing/E2E_EXTENSION_AI_TEST.md) · [`../design/SOLUTION_DESIGN.md`](../design/SOLUTION_DESIGN.md)

---

## What it is (and is not)

**Is:** recommended hygiene for Chat/Agent / metered AI-credit workflows. It scores open editors, applies **Shield** levers where the provider allows, and tracks **context cost** and session savings in **Overview**.

**Is not:** interception of any agent's private context pipeline. TokenForge uses exclusion APIs, tab control, and optional project hooks the user opts into. UI shows **effectiveness tier** per provider (`full` / `partial` / `advisory`).

Default scoring is **heuristic-only**. Optional Lane A enrichment is **opt-in** (`tokenforge.llmEnrichment`). Backends reuse `@tokenforge/enrichers` — same port as the CLI. Compact rules and Shield levers use `@tokenforge/policy-adapters` and `@tokenforge/context-adapters`. The extension never imports CLI.

Product UX (terminology, dual views, command intent): [`EXTENSION_PRODUCT.md`](../design/EXTENSION_PRODUCT.md).

---

## Quick start

```bash
npm run tokenforge:extension
```

Open the repo root → **Run Extension** (F5) → Extension Development Host → **TokenForge** activity-bar icon.

After a rebuild, **fully quit and relaunch** the Extension Development Host. `Developer: Reload Window` does not reload a rebuilt host. Manual AI E2E: [`E2E_EXTENSION_AI_TEST.md`](../testing/E2E_EXTENSION_AI_TEST.md).

---

## Dual views

| Surface | Role |
| --- | --- |
| Status bar | `context · shielded · saved` (click → Overview, or Prepare session when cost is high) |
| **Open tabs** tree | Settings row, then Needs review / Allowed / Shielded (+ approaching idle) |
| **Overview** webview | KPIs, enrichment status, quick actions, discover / drift / task-pack / overlap, honesty strip |
| Toolbar | Auto-shield, Shield all pending, More (export, analyze, discover, …) |

---

## Scoring rules

Shared kernel: `@tokenforge/risk-core` (`scoreRisk`).

A tab is **at-risk** when any of:

1. **High-risk filetype** — lockfile, generated, or **media** (assets flagged by shape)
2. **Oversized** — bytes ≥ 100 KiB
3. **Inactive** — focused ≥ `tokenforge.idleMinutesFocused` (default 10m); background ≥ `tokenforge.idleMinutesBackground` (default 5m)

Token estimate: `estTokens ≈ ceil(bytes / 4)`. Custom editor / image-preview tabs are tracked.

---

## Shield / Allow / Unshield

| Action | Display | Provider levers | Export |
| --- | --- | --- | --- |
| **Shield** | Removed from context cost | Adapter applies ignore / blocklist when available | `action: "filtered"` |
| **Allow** | Still counted (honest) | Clears levers if previously Shielded | `action: "kept"` |
| **Unshield** | Back to Allowed | Removes levers | `action: "kept"` |

**Only Shield reduces displayed context cost.**

| Mode | Cursor levers |
| --- | --- |
| Soft | Indexing ignore |
| Hard | `.cursorignore` managed session-shield block + `.tokenforge/session-shield.json` |

Optional: **Close tab on hard Shield**, **install Cursor hooks** (read-deny). Auto-shield lockfiles writes the same Hard levers (not estimate-only).

---

## Lane A (opt-in LLM)

Setting: `tokenforge.llmEnrichment` (default false). Toggle AI enrichment seeds local `ollama:qwen2.5-coder:3b` when `llm` is unset/`noop`. Default timeout 600s. Ollama is local — no `allowExternalLlm`. External backends need that flag or a one-time consent modal.

With enrichment **on**:

- **Analyze rules** — instruction files → hybrid `last-scan.json`; cache by excerpt hash
- **Prepare / Apply pack** — LLM ranks open-tab **metadata** (not file bodies)
- **Overlap radar** — semantic overlap across instruction files
- **Discover** — optional re-rank of missed-savings + recent-file candidates

With enrichment **off** or Ollama down: heuristic path; Detect still works.

---

## Prepare session and Discover

**Prepare session** — pre-prompt gate (Proceed / Review tabs / Shield pending / Skip) → optional task prompt → Apply and/or copy pack. Focused editor is never Shielded. Clipboard pack is estimate-only.

**Run discover** — `policy_gap` and `session_kept` vs applied exclusion YAML (same idea as CLI `tokenforge discover`), plus recent files, MCP config audit, monorepo package from the active editor. Persists `.tokenforge/discover-latest.json` on the command (not on every Overview refresh).

---

## Compact rules

`tokenforge.compactRulesPreview` — dry-run then apply managed policy sections. Preserves user text outside `tokenforge:begin/end`.

---

## Export / Prove handoff

- `.tokenforge/last-scan.json` — Token Risk contract ([`schemas/risk-event.schema.json`](../schemas/risk-event.schema.json), `$id`: `https://tokenforge.dev/schema/risk-event/v5`); open tabs in `activePaths`
- `.tokenforge/session-stats.json` — session ledger
- Auto-export debounces; skips timestamp-only churn

CLI: `scan --active-paths-file path/to/last-scan.json` treats those paths as kept.

---

## Settings (high-signal)

| Setting | Default | Role |
| --- | --- | --- |
| `tokenforge.llmEnrichment` | false | Lane A master switch |
| `tokenforge.llm` | `noop` | Same spec as CLI `--llm` |
| `tokenforge.llmTimeout` | 600 | Seconds per enricher batch |
| `tokenforge.allowExternalLlm` | false | Non-local backends |
| `tokenforge.prePromptGate` | false | Prepare-session cost gate |
| `tokenforge.autoFilterHighRisk` | false | Auto-shield lockfiles (workspace only) |
| `tokenforge.installCursorHooks` | false | Lane B read-deny hooks |
| `tokenforge.continuousAnalyze` | false | Analyze on save |
| `tokenforge.durableFilterDecisions` | false | Persist Allow/Shield |

---

## Demo tip

Open `fixtures/hybrid-eval-app/package-lock.json` — flags immediately. Hard Shield the lockfile and watch Overview session saved KPI. Instruction-file Lane A: `fixtures/instructions-app`. See [`PILOT_RUNBOOK.md`](../runbooks/PILOT_RUNBOOK.md) and [`E2E_EXTENSION_AI_TEST.md`](../testing/E2E_EXTENSION_AI_TEST.md).
