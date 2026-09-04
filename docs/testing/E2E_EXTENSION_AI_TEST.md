# E2E test — Context Guard extension with Ollama `qwen2.5-coder`

A self-serve, end-to-end runbook that exercises **every** Context Guard
functionality and validates its **two** AI-integration lanes using a local
Ollama `qwen2.5-coder` model.

Related: [`EXTENSION_CONTEXT_GUARD.md`](../adapters/EXTENSION_CONTEXT_GUARD.md) ·
[`HYBRID_SCAN_DESIGN.md`](../design/HYBRID_SCAN_DESIGN.md) ·
[`LLM_ENRICHER_SETUP.md`](../adapters/LLM_ENRICHER_SETUP.md) ·
[`E2E_HYBRID_SCAN_TEST.md`](./E2E_HYBRID_SCAN_TEST.md) ·
[`E2E_ACTIVE_SESSION_TEST.md`](./E2E_ACTIVE_SESSION_TEST.md)

## What "integration with AI" means here

The extension touches AI in **two distinct ways**; a real E2E proves both.

- **Lane A — Extension → LLM.** Opt-in (`tokenforge.llmEnrichment`). Calls a
  model for **Analyze rules** (and `continuousAnalyze`), **task-pack ranking**
  (Prepare / Apply pack), **instruction overlap**, and **Discover rank**. Live
  tab scoring stays heuristic.
- **Lane B — Shield → the AI agent's context.** Shield keeps files out of an
  agent's context via provider levers (`.cursorignore` / `.cursorindexingignore`)
  and **Cursor hooks** (read-deny). Proving those artifacts are written and
  enforced is the other half.

The plan sweeps every command/view/setting and marks which lane each step proves.

## Environment notes

- Model call path is shared with the CLI (`@tokenforge/enrichers`). Default
  Ollama endpoint is `http://127.0.0.1:11434` (`/api/chat` for generation,
  `/api/tags` for preflight).
- On a **CPU-only** host, `qwen2.5-coder:7b` runs slowly. The extension default
  `tokenforge.llmTimeout` is **600 s/batch**; use `900`+ for 7B on CPU. Keep the
  candidate set small (use `fixtures/instructions-app`), or use
  `qwen2.5-coder:3b` / `:1.5b` (same code path) for speed.
- `ollama` is treated as **local**, so `tokenforge.allowExternalLlm` is NOT
  required (no consent modal — a status-bar preflight instead).

---

## Part 0 — Prerequisites & setup

**0.1 Install + start Ollama, pull the model**

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama serve  >/tmp/ollama.log 2>&1 &      # leave running; this log is your AI-proof
ollama pull qwen2.5-coder:7b               # ~4.7 GB; or :3b / :1.5b for speed
curl -s http://127.0.0.1:11434/api/tags | jq '.models[].name'   # must list the tag
```

**0.2 Build + launch the Extension Development Host**

```bash
cd /workspace && npm install && npm run tokenforge:extension
```

Then either press **F5 → "Run Extension"** in VS Code on this repo, or launch
headless:

```bash
code --extensionDevelopmentPath=/workspace/extension --disable-extensions --disable-workspace-trust /workspace
```

Gotcha: **"Developer: Reload Window" does NOT reload a rebuilt extension host.**
After any `npm run tokenforge:extension` rebuild, fully quit and relaunch the dev
host.

**0.3 Workspace settings** (`.vscode/settings.json` in the dev-host workspace):

```json
{
  "tokenforge.llmEnrichment": true,
  "tokenforge.llm": "ollama:qwen2.5-coder:7b",
  "tokenforge.llmTimeout": 900,
  "tokenforge.llmEndpoint": "",
  "tokenforge.continuousAnalyze": false,
  "tokenforge.prePromptGate": true,
  "tokenforge.notifyOnIdle": true
}
```

---

## Part 1 — Detect / scoring (heuristic; no AI)

Open the TokenForge shield icon → **Open tabs** + **Overview** views.

1. Open `fixtures/noisy-app/package-lock.json` and `fixtures/noisy-app/dist/bundle.js`
   → both land under **Needs review** immediately (lockfile / generated).
2. Open `fixtures/asset-dump-app/assets/icons/add.svg` (image preview) → it appears
   under **Needs review** as **media** (custom-editor tab tracking).
3. Open a normal source file (`fixtures/noisy-app/src/index.js`) → not flagged
   immediately; after the idle threshold it moves to **Approaching idle** then at-risk.
4. **Refresh scores**; confirm **Overview → Context cost** equals the sum of at-risk
   open tabs.

Pass: risk classes and Context cost match; the SVG shows up.

---

## Part 2 — Shield levers (Lane B, part 1)

1. **Manual Shield** on `package-lock.json` → moves to **Shielded**, Context cost
   drops, **Session shielded** rises, toast shows tokens saved. Verify on disk:

   ```bash
   cat /workspace/.cursorignore                     # managed tokenforge:session-shield block
   cat /workspace/.tokenforge/session-shield.json   # entry: mode "hard", provider "cursor"
   ```

2. **Unshield** → the `.cursorignore` and `session-shield.json` entries are removed.
3. **Auto-shield lockfiles**: open a fresh lockfile + the SVG, toggle it ON →
   pending high-risk tabs auto-move to **Shielded** and `.cursorignore` gains their
   entries (auto-shield writes real levers, not estimate-only).
4. **Shield all pending**, **Clean session** (resets decisions + `session-shield.json`
   + `.cursorignore` block), **Close tab on hard Shield**, **Durable choices**
   (persists to `.tokenforge/filter-decisions.json` across reloads).

Pass: every Shield action is mirrored in `.cursorignore` + `.tokenforge/*`;
Unshield/Clean fully revert them.

---

## Part 3 — Cursor hooks: Shield blocks agent reads (Lane B, part 2 — deepest AI proof)

1. Set `"tokenforge.installCursorHooks": true`, then fully relaunch the dev host.
2. Verify artifacts:

   ```bash
   cat /workspace/.cursor/hooks.json
   ls -la /workspace/.cursor/hooks/           # tokenforge-shield-read.js, tokenforge-post-turn.js
   ```

3. Shield a file (Part 2.1), then simulate a Cursor agent read of a shielded path by
   invoking the read-deny hook with a payload matching the `hooks.json` stdin contract:

   ```bash
   echo '{"file_path":"fixtures/noisy-app/package-lock.json"}' \
     | node /workspace/.cursor/hooks/tokenforge-shield-read.js ; echo "exit=$?"
   ```

   Pass: the hook returns a deny/blocked decision for the shielded path and allows a
   non-shielded path.
4. **Post-turn logging**: the post-turn hook appends read paths to
   `.tokenforge/post-turn-paths.jsonl` (note: it runs whenever hooks are installed;
   the `postTurnLogging` setting is not separately wired — confirm as a finding).

---

## Part 4 — AI enrichment with Ollama `qwen2.5-coder` (Lane A — the star)

Use a bounded instruction set: open `fixtures/instructions-app` as the workspace
(`.cursorrules`, `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`), and
mirror the Part 0.3 settings into its `.vscode/settings.json`.

1. **Negative control**: set `llmEnrichment: false`, run **Analyze rules** → expect a
   warning and **no** Ollama call. Re-enable it.
2. **Watch the model**: `tail -f /tmp/ollama.log` (expect `POST /api/chat` per pass).
3. Run **Analyze rules** (Overview button, "…" overflow, or Command Palette). Expect a
   progress notification: preflight (`/api/tags`) → multi-pass (map → judge, batch
   size 2 → reconcile). On CPU 7B this takes minutes — hence the 900 s timeout.
4. **Prove the AI ran** (three independent signals):
   - `/tmp/ollama.log` shows multiple `POST /api/chat` with `model qwen2.5-coder:7b`.
   - The report is hybrid:

     ```bash
     jq '.scan, (.layers|keys)' /workspace/fixtures/instructions-app/.tokenforge/last-scan.json
     ```

     Expect `scan.mode: "hybrid"`, `scan.llm.backend: "ollama"`,
     `scan.llm.model: "qwen2.5-coder:7b"`, and a populated LLM findings layer.
   - Findings include semantic notes heuristics can't produce.
5. **Compact rules** (`tokenforge.compactRulesPreview`): with LLM findings present
   (prefer disk `last-scan.json` hybrid layers), preview → apply. Uses the same
   `synthesizeManagedPolicy` path as CLI `apply` — heuristic by default; hybrid when
   `llmEnrichment` is on. Modal shows **Heuristic** vs **AI hybrid**. It writes a lean
   managed block into the provider instruction file (e.g. `.github/copilot-instructions.md`
   or `GEMINI.md` for `tokenforge.provider: gemini`); confirm user text outside the
   markers is preserved.
6. **Continuous analyze**: set `continuousAnalyze: true`, edit + save `AGENTS.md` →
   after ~2 s a debounced Analyze rules re-runs on that path. Turn it back off.

Failure modes: `llmEnrichment` off → warning (no call); Ollama down → "cannot reach
Ollama…"; timeout on 7B → raise `llmTimeout` or use `:3b`; "No instruction paths
found" → the open folder has no instruction files.

---

## Part 5 — Session / agent-prep

- **Prepare agent session** — If `prePromptGate` is on and context cost is over
  the rules budget: **Proceed** / **Review tabs** / **Shield pending** (dismiss
  = Skip). Then optional task prompt (when enrichment is on), then confirm
  **Apply pack** / **Copy pack** / both / **Review Open tabs**. Apply Allows the
  pack and soft-Shields other pending tabs; the **focused tab is never
  Shielded**. Copy puts an estimate-only path list on the clipboard (not injected
  into any agent). With enrichment on, pack order is an LLM rank of tab metadata.
- **Apply task pack** — Same apply rule without the Prepare confirmation UI.
- **Run discover** — Missed savings vs last-scan / current session (`policy_gap`,
  `session_kept`) plus recent files, MCP audit, and monorepo package hint from
  the active editor. Writes `.tokenforge/discover-latest.json`. With enrichment
  on, a bounded LLM may re-rank that shortlist. Add a dummy `.cursor/mcp.json` to
  see MCP findings.
- **Copy smart excerpt** — select code, run it, paste elsewhere → clipboard has a
  `path:line` header + ≤ 2 KB excerpt (heuristic; no model).

---

## Part 6 — Prove / export + cross-surface parity

1. **Export / Reveal last-scan.json** and **session-stats.json**; shielded tabs appear
   as `filtered` findings and open tabs appear in `activePaths`.
2. **Dashboard**: `npm run tokenforge:dashboard`, open the app, **Load JSON** →
   `fixtures/instructions-app/.tokenforge/last-scan.json` → the hybrid board renders
   your Ollama findings.
3. **CLI parity** (same enrichers code):

   ```bash
   npm run tokenforge -- scan fixtures/instructions-app --mode hybrid \
     --llm ollama:qwen2.5-coder:7b --llm-timeout 1800
   ```

   Compare `scan.llm` in the CLI's `scan-report.json` vs the extension's
   `last-scan.json`.
4. **Active-session signal**:

   ```bash
   npm run tokenforge -- scan fixtures/instructions-app \
     --active-paths-file fixtures/instructions-app/.tokenforge/last-scan.json
   ```

   Files you had open are downgraded to `kept`.

---

## Part 7 — Settings matrix (fast toggles)

Verify: `prePromptGate` + `rulesBudgetThreshold` (exceed it → gate banner/modal),
`notifyOnIdle`, `contextProvider` (`auto` → `cursor` changes which lever adapter Shield
uses), `provider` (recorded in `last-scan.json` only), `idleMinutesFocused/Background`,
`workspaceMode` (eligibility), `team` / `repo` labels in the export.

---

## Cleanup

```bash
cd /workspace && git checkout -- . && git clean -fd .tokenforge .cursor/hooks 2>/dev/null
rm -f .cursorignore fixtures/instructions-app/.cursorignore
# stop ollama: kill the `ollama serve` PID from /tmp/ollama.log
```

## Coverage map

- **Lane A** (Extension→LLM): Part 4 + Part 6.3 parity.
- **Lane B** (Shield→agent context): Part 2 + Part 3.
- **Heuristic surface**: Parts 1, 7 + scoring/Shield views throughout.
- **Session / Discover**: Part 5 (heuristic fallback; Lane A when enrichment on).
- **Prove / interop**: Part 6.

Two honesty notes to keep in mind: live tab scoring does not "use AI", Lane A is
opt-in, and `postTurnLogging` is not separately gated (the post-turn hook runs
whenever hooks are installed).
