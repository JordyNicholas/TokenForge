# TokenForge — AI Context Guard

Cut token bleed from **open tabs** and **AI rules**. Shield costly context, analyze instructions, and track session savings — standalone in VS Code; no CLI required for the daily developer path.

Works with **Cursor**, **GitHub Copilot**, and other agents via provider-native exclusion levers (honest effectiveness tiers — not pipeline interception).

## Features

- **Overview** — context cost, session saved, rules cost KPIs; discover, drift, and task-pack cards
- **Open tabs** — Shield / Allow / Unshield with effectiveness badges (`full` / `partial` / `advisory`)
- **Real Shield** — `.cursorignore` / `.copilotignore` managed sections, optional tab close, optional Cursor hooks
- **Analyze rules** — opt-in LLM enrichment on instruction paths (same enrichers as CLI)
- **Compact rules** — preview and apply policy packs from the IDE via `@tokenforge/policy-adapters`
- **Prove** — session ledger + status bar savings; export under More for managers

## Quick start

1. Install from Marketplace (or run from source: `npm run tokenforge:extension` → F5).
2. Open a folder workspace with a git repo or root manifest.
3. Complete the **TokenForge walkthrough** (activity bar → Overview).
4. Open a lockfile tab → **Open tabs** → **Needs review** → **Shield**.

## Settings (high signal)

| Setting | Purpose |
| --- | --- |
| `tokenforge.autoFilterHighRisk` | Auto-shield lockfiles (workspace-only) |
| `tokenforge.closeTabOnHardShield` | Close editor after hard Shield |
| `tokenforge.installCursorHooks` | Opt-in Cursor hooks for read deny |
| `tokenforge.llmEnrichment` | Enable Analyze rules LLM path |
| `tokenforge.prePromptGate` | Warn before high context-cost agent turns |
| `tokenforge.continuousAnalyze` | Debounced analyze on instruction save |

Full product doc: [EXTENSION_PRODUCT.md](https://github.com/JordyNicholas/TokenForge/blob/main/docs/design/EXTENSION_PRODUCT.md).

## Honesty

TokenForge recommends Shield/Allow and applies your host's exclusion APIs when you choose. It does not read or block private agent chat context. Partial tiers are shown honestly for Copilot and generic hosts.

## License

See repository root LICENSE.

## Marketplace screenshots (#279)

Before publishing to the VS Code Marketplace, capture a **light, honest** gallery (1280×800 or VS Code's recommended sizes):

| # | Scene | What to show |
| --- | --- | --- |
| 1 | Overview | KPI band (context cost, session saved, rules cost) + walkthrough complete |
| 2 | Open tabs | Shield / Allow on a lockfile with effectiveness badge |
| 3 | Real Shield | `.cursorignore` managed section after Shield (partial tier OK for Copilot) |
| 4 | Analyze rules | Opt-in LLM enrichment banner — heuristic default visible |
| 5 | Compact rules | Dry-run webview before Apply |
| 6 | Prove handoff | Export last-scan + session-stats → dashboard URL |

**Checklist**

- [ ] Icon: `extension/media/tokenforge-icon.png` (ships)
- [ ] README hero + feature bullets match [`EXTENSION_PRODUCT.md`](../docs/design/EXTENSION_PRODUCT.md)
- [ ] No claims of intercepting private agent context
- [ ] Screenshots use a real repo (e.g. `fixtures/noisy-app`), not mocked billing
- [ ] `vsce package` / CI `package:vsix` green before upload
