# Context Guard — VS Code extension

**Status:** Locked  
**Scope:** Detect + Shield + embedded Fix/Prove — standalone extension product.  
**Audience:** Extension developers and demo operators.  
**Companion:** [`../design/EXTENSION_PRODUCT.md`](../design/EXTENSION_PRODUCT.md) · [`../design/SOLUTION_DESIGN.md`](../design/SOLUTION_DESIGN.md)

---

## What it is (and is not)

**Is:** recommended hygiene for Chat/Agent / metered AI-credit workflows. It scores open editors, applies **Shield** levers where the provider allows, and tracks **context cost** and session savings in **Overview**.

**Is not:** interception of any agent's private context pipeline. TokenForge uses exclusion APIs, tab control, and optional project hooks the user opts into. UI shows **effectiveness tier** per provider (`full` / `partial` / `advisory`).

Default scoring is **heuristic-only**. Optional LLM enrichment on instruction paths is **opt-in** (`tokenforge.llmEnrichment` + **Analyze rules**) and writes hybrid `layers` / `scan.llm` into `.tokenforge/last-scan.json`. Backends reuse `@tokenforge/enrichers` — same port as the CLI.

**Compact rules** and Shield levers use shared packages (`@tokenforge/policy-adapters`, `@tokenforge/context-adapters`) — extension never imports CLI.

## Quick start

```bash
npm run tokenforge:extension
```

Open the repo root → **Run Extension** (F5) → Extension Development Host → **TokenForge** activity-bar icon.

## Surfaces

| Surface | Role |
| --- | --- |
| Status bar | `context · shielded · saved` (click → Overview or Prepare session when cost is high) |
| **Open tabs** tree | Settings row, then Needs review / Allowed / Shielded (+ Approaching idle) |
| **Overview** webview | Hero KPIs, quick actions, discover/drift/task-pack cards, honesty strip |
| Toolbar | Auto-shield toggle, Shield all pending, More (export, analyze, discover, …) |
| **Prepare session** | Gate + optional task prompt + Apply and/or copy pack (focused tab never Shielded) |
| **Run discover** | Missed Fix opportunities vs applied policy, session-kept tabs, recent files, MCP, monorepo hint |

## Scoring rules

Shared kernel: `@tokenforge/risk-core` (`scoreRisk`).

A tab is **at-risk** when any of:

1. **High-risk filetype** — lockfile or generated — immediate
2. **Oversized** — bytes ≥ 100 KiB
3. **Inactive** — focused ≥ `tokenforge.idleMinutesFocused` (default 10m); background ≥ `tokenforge.idleMinutesBackground` (default 5m)

Token estimate: `estTokens ≈ ceil(bytes / 4)`.

## Shield / Allow / Unshield

| Action | Display | Provider levers | Export |
| --- | --- | --- | --- |
| **Shield** | Removed from context cost | Adapter applies ignore / blocklist when available | `action: "filtered"` |
| **Allow** | Still counted (honest) | Clears levers if previously Shielded | `action: "kept"` |
| **Unshield** | Back to Allowed | Removes levers | `action: "kept"` |

**Only Shield reduces displayed context cost.**

Hard Shield on Cursor merges `.cursorignore` managed section + session blocklist; optional **Close tab on hard Shield** and **install Cursor hooks** (opt-in).

## Auto-shield lockfiles (opt-in, workspace-only)

Setting: `tokenforge.autoFilterHighRisk` (default **false**). Workspace scope only — user/global values ignored.

Toggle from Open tabs settings row, toolbar zap/check, status bar tint, or command **Auto-shield lockfiles**.

When enabled, pending lockfile/generated tabs Shield automatically. Allow/Unshield remain user overrides.

## Export / Prove handoff

- `.tokenforge/last-scan.json` — Token Risk contract ([`schemas/risk-event.schema.json`](../schemas/risk-event.schema.json), `$id`: `https://tokenforge.dev/schema/risk-event/v5`)
- `.tokenforge/session-stats.json` — session ledger export (under More)
- Auto-export debounces; skips timestamp-only churn

## Demo tip

Open `fixtures/hybrid-eval-app/package-lock.json` — flags immediately. Hard Shield the lockfile and watch Overview session saved KPI. See [`PILOT_RUNBOOK.md`](../runbooks/PILOT_RUNBOOK.md).
