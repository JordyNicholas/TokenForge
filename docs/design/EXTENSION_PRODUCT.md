# TokenForge Extension — Product & UX

**Status:** Locked (F8–F13 integrated rebuild)  
**Audience:** Developers, PMs, extension contributors  
**Companion:** [`EXTENSION_CONTEXT_GUARD.md`](../adapters/EXTENSION_CONTEXT_GUARD.md) (adapter doc)

---

## Positioning

**Extension** = live session + AI context control (standalone daily path).  
**CLI** = batch scan, CI, org pilot, bill import.

Same kernel (`@tokenforge/risk-core`), same `.tokenforge/last-scan.json` contract; different superpowers.

---

## Dual views

| View | Role |
| --- | --- |
| **Overview** | Hero KPIs (context cost, session saved, rules cost), quick actions, AI cards (task pack, discover, drift), honesty strip |
| **Open tabs** | Operational Shield surface — settings row first, then Needs review / Allowed / Shielded |

---

## Terminology (user-visible)

Internal command IDs stay stable (`tokenforge.filterTab` → Shield). User strings use:

| Legacy | New |
| --- | --- |
| Filter / Keep / Restore | **Shield** / **Allow** / **Unshield** |
| At-risk tabs | **Open tabs** |
| Risk pulse | **Overview** |
| Auto-filter | **Auto-shield lockfiles** |
| Enrich instruction paths | **Analyze rules** |
| Pending / Kept / Filtered | **Needs review / Allowed / Shielded** |
| Live estimate | **Context cost** |

Status bar: `12k context · 4 shielded · 8k saved`

---

## Shield & honesty

**Shield** applies provider-native levers via `@tokenforge/context-adapters`:

| Mode | Levers | UI |
| --- | --- | --- |
| Soft | Index-only block (e.g. `.cursorindexingignore`) | Partial / indexing |
| Hard | `.cursorignore` managed section, session blocklist, optional tab close + Cursor hooks | Full on Cursor when hooks enabled |

**Effectiveness tiers:** `full` · `partial` · `advisory` — shown per row and in Overview footnote.

TokenForge does **not** intercept private vendor agent pipelines. It uses exclusion APIs, tab control, and optional project hooks the user opts into.

---

## AI surfaces (opt-in)

| Feature | Setting / command | Notes |
| --- | --- | --- |
| Analyze rules | `tokenforge.llmEnrichment`, **Analyze rules** | Bounded instruction files; cache; transparency coach before external send |
| Pre-prompt gate | `tokenforge.prePromptGate` | Proceed / Review tabs / Shield pending / Skip when context cost is high |
| Task context pack | **Prepare session**, **Apply task pack** | Confirm Apply and/or copy a paste-safe list; focused tab never Shielded; LLM rank when enrichment on |
| Discover | **Run discover** | Missed policy gaps + session-kept + recent files + MCP + monorepo; optional LLM rank; `.tokenforge/discover-latest.json` |
| Compact rules | **Compact rules preview** | Apply via `@tokenforge/policy-adapters` managed sections |
| Smart excerpt | **Copy smart excerpt** | Selection → clipboard for chat paste (no model) |
| Drift advisor | Overview card | Pending/idle/lockfile heuristics; no chat read |

---

## Prove (embedded)

| Metric | Source |
| --- | --- |
| Session saved | Session ledger |
| Context cost | Open tabs heuristic |
| Rules cost | Instruction watch |
| Shield effectiveness | Adapter audit trail |

Export (`.tokenforge/last-scan.json`, session-stats) lives under **More** — optional for managers.

**Savings tiers:** Session estimate / Rules policy / Not billing — see dashboard savings tiers; extension copy mirrors honesty constraints.

---

## Brand

Palette (from dashboard theme): teal `#006A64` / `#4FDBD0`, accent `#9A6700` / `#F5C44C`.  
Icon: shield + funnel (`extension/media/tokenforge.svg`, `tokenforge-icon.png`).

Marketplace: **TokenForge — AI Context Guard**
