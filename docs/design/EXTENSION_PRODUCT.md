# TokenForge Extension — Product & UX

**Status:** Locked  
**Scope:** What the Context Guard extension is, how dual views and Shield work, and which surfaces call an LLM.  
**Audience:** Developers, PMs, extension contributors  
**Companion:** [`EXTENSION_CONTEXT_GUARD.md`](../adapters/EXTENSION_CONTEXT_GUARD.md) · [`E2E_EXTENSION_AI_TEST.md`](../testing/E2E_EXTENSION_AI_TEST.md) · [`BOARD.md`](../delivery/BOARD.md)

---

## Positioning

**Extension** = live session + AI context control (standalone daily path).  
**CLI** = batch scan, CI, org pilot, bill import.  
**Dashboard** = Prove calculator and org views.

Same kernel (`@tokenforge/risk-core`), same `.tokenforge/last-scan.json` contract. Delivery surfaces do not import each other. Provider file formats live in adapters (`@tokenforge/context-adapters`, `@tokenforge/policy-adapters`), not in `risk-core`.

Marketplace name: **TokenForge — AI Context Guard**.

---

## Dual views

| View | ID | Role |
| --- | --- | --- |
| **Overview** | `tokenforge.riskPulse` | Hero KPIs (context cost, session saved, rules cost), AI enrichment status, quick actions, task pack / discover / drift / overlap cards, honesty strip |
| **Open tabs** | `tokenforge.riskPanel` | Operational Shield surface — settings row first, then **Needs review** / **Allowed** / **Shielded** / approaching idle |

Activity bar container: TokenForge shield icon. Both views require `tokenforge.workspaceEligible` (folder workspace).

Status bar: `context · shielded · saved`. Click focuses Overview, or **Prepare session** when context cost is high.

View title: Auto-shield and Shield all pending stay as icons. Extra commands use VS Code’s overflow (`…`). **All TokenForge actions…** is Command Palette only (list icon) so it is not a second ellipsis on the same row. The TokenForge sidebar `…` is the container menu.

---

## Terminology (user-visible)

Internal command IDs stay stable (`tokenforge.filterTab` still Shields). User strings use:

| Legacy | New |
| --- | --- |
| Filter / Keep / Restore | **Shield** / **Allow** / **Unshield** |
| At-risk tabs | **Open tabs** |
| Risk pulse | **Overview** |
| Auto-filter | **Auto-shield lockfiles** |
| Enrich instruction paths | **Analyze rules** |
| Pending / Kept / Filtered | **Needs review / Allowed / Shielded** |
| Live estimate | **Context cost** |

---

## Shield & honesty

**Shield** applies provider-native levers via `@tokenforge/context-adapters`. TokenForge does **not** intercept private vendor agent pipelines.

| Mode | Levers (Cursor) | UI / effectiveness |
| --- | --- | --- |
| Soft | Index-only block (e.g. `.cursorindexingignore`) | Partial / indexing |
| Hard | `.cursorignore` managed `tokenforge:session-shield` section + `.tokenforge/session-shield.json`; optional close tab + Cursor hooks | Full when hooks enabled |

**Effectiveness tiers:** `full` · `partial` · `advisory` — per Open tabs row and Overview footnote.

| Action | Context cost | Levers | Export `action` |
| --- | --- | --- | --- |
| **Shield** | Drops the tab | Apply ignore / blocklist | `filtered` |
| **Allow** | Still counted (honest) | Clear levers if previously Shielded | `kept` |
| **Unshield** | Back in Needs review / Allowed | Remove levers | `kept` |

**Only Shield reduces displayed context cost.** Auto-shield (opt-in, workspace-scoped) Hard-Shields pending lockfile/generated tabs with real levers, not estimate-only.

---

## Detect (heuristic — no model)

Shared `scoreRisk` / `assessTab`. A tab is at-risk when any of:

1. High-risk class — lockfile, generated, media (shape, not only size)
2. Oversized — bytes ≥ 100 KiB
3. Inactive — focused ≥ `tokenforge.idleMinutesFocused` (default 10m); background ≥ `tokenforge.idleMinutesBackground` (default 5m)

`estTokens ≈ ceil(bytes / 4)`. Image-preview / custom-editor tabs are scored. Default Detect never calls an LLM.

---

## Two AI lanes

| Lane | Meaning | When |
| --- | --- | --- |
| **A — Extension → LLM** | The extension calls a model | `tokenforge.llmEnrichment` on (default **off**). Toggle seeds `ollama:qwen2.5-coder:3b` if `llm` was `noop`. |
| **B — Shield → agent context** | Provider files/hooks change what *the user's* agent can load | Any Shield; optional `tokenforge.installCursorHooks` |

**AI-First (F15)** = first-class, low-friction **judgment** (rules analysis, task-pack rank, overlap, Discover rank), cached and cost-bounded. Deterministic tab scoring stays heuristic.

| Feature | Command / setting | Lane A? |
| --- | --- | --- |
| Analyze rules | `tokenforge.enrichInstructions` | Yes — instruction files only; content-hash cache |
| Continuous analyze | `tokenforge.continuousAnalyze` | Yes — debounced Analyze on save |
| Task pack rank | Prepare / Apply pack | Yes when enrichment on; else top-8 by tokens |
| Overlap radar | Overview card | Yes when enrichment on; else basename heuristic |
| Discover rank | `tokenforge.runDiscover` | Yes when enrichment on; heuristic missed-savings always |
| Compact rules | `tokenforge.compactRulesPreview` | No live model — Fix from last-scan via policy adapters |
| Smart excerpt | `tokenforge.copySmartExcerpt` | No |
| Drift advisor | Overview | No |
| Session summary | Overview | No (KPI sentences; optional LLM is #276) |
| Transparency coach | External backends | Consent modal; Ollama is local (preflight only) |

---

## Session commands

**Prepare session** (`tokenforge.prepareAgentSession`):

1. If `prePromptGate` and context cost ≥ `rulesBudgetThreshold`: **Proceed** / **Review tabs** / **Shield pending** (dismiss = Skip).
2. Optional task prompt when enrichment is on.
3. Confirm **Apply pack** / **Copy pack** / both / **Review Open tabs**.
4. Apply Allows pack paths and soft-Shields other pending tabs. **Focused tab is never Shielded.** Copy is a paste-safe list — not injected into any agent.

**Apply task pack** — same apply rule without the confirmation UI.

**Run discover** — CLI-aligned missed savings (`policy_gap`, `session_kept`) from current session / last-scan vs applied exclusion YAML, plus recent files, MCP audit, monorepo hint from the active editor. **Run discover** writes `.tokenforge/discover-latest.json`. Overview card does not persist.

---

## Compact rules (Fix in IDE)

Dry-run + apply managed `tokenforge:begin/end` sections through `@tokenforge/policy-adapters`. User text outside markers is preserved. Uses the in-memory / last-scan report, not a second model call.

---

## Prove (embedded)

| Metric | Source |
| --- | --- |
| Session saved | Session ledger (Filter/Shield events; survives tab close) |
| Context cost | Open tabs heuristic |
| Rules cost | Instruction-file budget watch |
| Shield effectiveness | Adapter audit trail |

Exports (More menu): `.tokenforge/last-scan.json` (Token Risk contract, `activePaths` = open tabs), `.tokenforge/session-stats.json`. Auto-export debounces. Dashboard does **not** yet consume session-stats (F4).

**Savings tiers:** session estimate / rules policy / not billing — same honesty as the dashboard.

---

## On-disk artifacts (workspace)

| Path | Role |
| --- | --- |
| `.tokenforge/last-scan.json` | Prove / CLI handoff |
| `.tokenforge/session-stats.json` | Session ledger export |
| `.tokenforge/filter-decisions.json` | Durable Allow/Shield (opt-in) |
| `.tokenforge/session-shield.json` | Hard Shield blocklist |
| `.tokenforge/enrich-cache.json` | Analyze rules cache |
| `.tokenforge/discover-latest.json` | Last **Run discover** |
| `.cursorignore` / indexing ignore | Managed Shield section (Cursor) |
| `.cursor/hooks.json` + hook scripts | Opt-in read-deny / post-turn log |

---

## Brand

Palette (dashboard theme): teal `#006A64` / `#4FDBD0`, accent `#9A6700` / `#F5C44C`.  
Icon: shield + funnel (`extension/media/tokenforge.svg`, `tokenforge-icon.png`).

---

## Packages

| Package | Job |
| --- | --- |
| `@tokenforge/risk-core` | Score, classes, report contract |
| `@tokenforge/context-adapters` | Shield levers (Cursor / Copilot partial / generic) |
| `@tokenforge/policy-adapters` | Compact-rules / Fix file rendering |
| `@tokenforge/enrichers` | LLM enrich + JSON judge (Ollama local default) |

The extension must not import `cli/` or the dashboard.

---

## Implementation status

Wave epics F8–F13 (#237–#242) are **closed** on GitHub (rebuild landed as one delivery). Child issues were not all closed individually; **code on `main` is the source of truth** (see [`BOARD.md`](../delivery/BOARD.md) F8–F13 tables).

| Doc claim | Code today |
| --- | --- |
| AI-narrated session summary | **Heuristic KPI sentences** — optional LLM wrap is #276 |
| `postTurnLogging` setting | Post-turn hook runs whenever hooks are installed; setting is not a separate gate (#273) |
| Marketplace screenshots | Icon only; screenshot pack is #279 |
| Session stats on dashboard | Extension writes JSON; dashboard does not load it |
