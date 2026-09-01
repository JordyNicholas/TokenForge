# Context Guard — VS Code extension

**Status:** Locked  
**Scope:** Detect surface — tab scoring, Keep/Filter, exports.  
**Audience:** Extension developers and demo operators.  
**Companion:** [`../design/SOLUTION_DESIGN.md`](../design/SOLUTION_DESIGN.md) · [`../runbooks/DEMO_RUNBOOK.md`](../runbooks/DEMO_RUNBOOK.md)

---

## What it is (and is not)

**Is:** recommended hygiene for Chat/Agent / metered AI-credit workflows. It scores
open editors and lets you Filter high-bleed tabs out of the live estimate.

**Is not:** interception of any agent’s private context pipeline. Filtering updates
TokenForge’s estimate and export file only — it does not close tabs or rewrite
Copilot/Cursor/Claude config by itself (that is CLI **Fix** / `tokenforge apply`).

Default Detect is **heuristic-only**. Optional LLM enrichment on instruction
paths is **opt-in** (`tokenforge.llmEnrichment` + command
**TokenForge: Enrich instruction paths**) and writes hybrid `layers` /
`scan.llm` into `.tokenforge/last-scan.json` without changing live Keep/Filter
scoring. Backends reuse `@tokenforge/enrichers` (noop, Ollama, Anthropic, Codex) —
same port as the CLI ([`HYBRID_SCAN_DESIGN.md`](../design/HYBRID_SCAN_DESIGN.md)).

## Quick start

```bash
npm run tokenforge:extension
```

Open the repo root → **Run Extension** (F5) → Extension Development Host →
**TokenForge** activity-bar icon.

## Surfaces

| Surface | Role |
| --- | --- |
| Status bar | Compact `TokenForge: … at risk` (click focuses the panel) |
| **At-risk tabs** tree | Pending / Kept / Filtered (+ Approaching idle) with Keep, Filter, Restore |
| **Risk pulse** webview | Live before → after → saved **after** you Filter; otherwise “at risk now” |
| Toolbar | Refresh, Export, Reveal last-scan, Clear decisions, Enrich instruction paths (opt-in) |

## Scoring rules

Shared kernel: `@tokenforge/risk-core` (`scoreRisk`).

A tab is **at-risk** when any of:

1. **High-risk filetype** — lockfile or generated (e.g. `package-lock.json`, `dist/**`) — immediate
2. **Oversized** — bytes ≥ 100 KiB
3. **Inactive** —
   - **Focused** editor: idle ≥ **10 minutes**
   - **Background** (non-focused) tab: idle ≥ **5 minutes**

Token estimate: `estTokens ≈ ceil(bytes / 4)`.

The panel’s **Approaching idle** section appears after ≥1 minute idle, with a
countdown to the applicable threshold.

## Keep / Filter / Restore

| Action | Effect on display | Effect on export |
| --- | --- | --- |
| **Filter** | Drops tab from at-risk readout and status bar | `action: "filtered"` → counts as saved |
| **Keep** | Still at-risk (honest), marked Kept | `action: "kept"` |
| **Restore** | Undoes Filter → **Kept** (so auto-filter does not instantly re-apply) | `action: "kept"` |
| **Clear decisions** | All back to pending | pending → kept at export time until filtered |

Acceptance rule: **only Filter reduces displayed at-risk tokens.**

## Auto-filter (opt-in, **per workspace**)

Setting: `tokenforge.autoFilterHighRisk` (default **false**).

**Scope:** workspace / folder only. A User (global) setting is **ignored** so
enabling auto-filter in one repo cannot turn it on everywhere. Toggle always
writes the workspace `.vscode/settings.json` value.

**Turn it on from:**

- TokenForge **At-risk tabs** list — top row **Auto-filter high-risk** (shows
  `On · lockfile / generated` or `Off`; click to toggle)
- Sidebar toolbar — zap when off, check when on (title becomes
  **At-risk tabs · Auto** while enabled; banner message appears under the title)
- Status bar — appends `· auto` and a warning tint while enabled
- Risk pulse — “Auto-filter ON” banner
- Command Palette → **TokenForge: Toggle Auto-filter High-Risk**
- Settings → search `tokenforge.autoFilterHighRisk`

When enabled, pending **lockfile** and **generated** tabs are Filtered automatically.
Keep/Restore remain durable overrides. This never closes editors or writes vendor
ignore files — it only updates the Detect estimate and `last-scan.json`.

## Export / Prove handoff

- Path: `.tokenforge/last-scan.json` (workspace folder)
- Contract: Token Risk ([`schemas/risk-event.schema.json`](./schemas/risk-event.schema.json),
  `$id`: `https://tokenforge.dev/schema/risk-event/v5`)
- `source: "extension"`; validated with `isTokenRiskReport`
- **Auto-export** debounces on session changes; skips rewrite when findings/totals
  are unchanged (timestamp-only churn does not touch disk)
- On write, ensures the workspace `.gitignore` contains `.tokenforge/`
- **Reveal last-scan.json** opens/reveals the file for demos or dashboard load

Settings written into the report: `tokenforge.team`, `tokenforge.repo`,
`tokenforge.provider` (scoring ignores provider).

## Demo tip

Open `fixtures/hybrid-eval-app/package-lock.json` and
`fixtures/hybrid-eval-app/test-results/junit.xml` — they flag immediately. Filter the
lockfile and watch Risk pulse unlock before/after/saved. Full stage script:
[`PRESENTATION_HYBRID_EVAL.md`](../runbooks/PRESENTATION_HYBRID_EVAL.md) (or legacy
≤5 min [`DEMO_RUNBOOK.md`](../runbooks/DEMO_RUNBOOK.md) on `noisy-app`).
