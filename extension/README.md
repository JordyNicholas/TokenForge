# TokenForge — AI Context Guard

Cut token bleed from **open tabs** and **AI rules**. Shield costly context, analyze instructions, and track session savings — standalone in VS Code; no CLI required for the daily developer path.

Works with **Cursor**, **GitHub Copilot**, **Gemini CLI**, **Claude Code**, and other agents via provider-native exclusion levers (honest effectiveness tiers — not pipeline interception).

## Features

- **Overview** — context cost, session saved, rules cost KPIs; daily Fix/Prove health strip; discover, drift, and task-pack cards
- **Open tabs** — Shield / Allow / Unshield with effectiveness badges (`full` / `partial` / `advisory`)
- **Real Shield** — `.cursorignore` / `.copilotignore` / `.geminiignore` managed sections, optional tab close, optional Cursor hooks
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
| `tokenforge.postTurnLogging` | When hooks installed, log post-turn read paths (observe-only) |
| `tokenforge.llmEnrichment` | Enable Analyze rules LLM path |
| `tokenforge.prePromptGate` | Warn before high context-cost agent turns |
| `tokenforge.continuousAnalyze` | Debounced analyze on instruction save |

Full product doc: [EXTENSION_PRODUCT.md](https://github.com/JordyNicholas/TokenForge/blob/main/docs/design/EXTENSION_PRODUCT.md).

## Honesty

TokenForge recommends Shield/Allow and applies your host's exclusion APIs when you choose. It does not read or block private agent chat context. Partial/advisory tiers are shown honestly for Copilot, Gemini, Claude, and generic hosts.

## License

See repository root LICENSE.

## Marketplace screenshots (#279)

Before publishing to the VS Code Marketplace, capture a **light, honest** gallery (1280×800 or VS Code's recommended sizes). Store binaries under `extension/media/` (icon ships today; gallery PNGs are added at publish time).

| # | File (recommended) | Scene | Alt text |
| --- | --- | --- | --- |
| 1 | `media/screenshot-overview.png` | **Detect — Overview** | TokenForge Overview showing context cost, session saved, and rules cost KPIs with the daily health strip (Scan, Session, Drift, Promote) |
| 2 | `media/screenshot-open-tabs.png` | **Shield — Open tabs** | Open tabs list with a lockfile marked Needs review and Shield / Allow actions plus a full effectiveness badge on Cursor |
| 3 | `media/screenshot-real-shield.png` | **Real Shield — ignore merge** | Editor or diff of `.cursorignore` with the TokenForge managed section after Shield; partial tier OK for Copilot |
| 4 | `media/screenshot-compact-rules.png` | **Compact — dry-run** | Compact rules webview preview before Apply with byte/token estimate and honesty footer |
| 5 | `media/screenshot-prove-handoff.png` | **Prove — handoff** | Export last-scan + session-stats with dashboard URL copied; Live hygiene tier visible |

### Capture tips

- Use `fixtures/noisy-app` or `fixtures/instructions-app` — real repos, not mocked billing.
- Light theme, Activity Bar → TokenForge, walkthrough complete.
- Show **heuristic default** on Analyze rules unless the screenshot is explicitly about opt-in LLM enrichment.
- No claims of intercepting private agent context or guaranteed invoice Δ.

**Checklist**

- [ ] Icon: `extension/media/tokenforge-icon.png` (ships)
- [ ] Gallery PNGs in `extension/media/` per table above
- [ ] README hero + feature bullets match [`EXTENSION_PRODUCT.md`](../docs/design/EXTENSION_PRODUCT.md)
- [ ] Alt text on every marketplace image
- [ ] `vsce package` / CI `package:vsix` green before upload
