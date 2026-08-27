# Hybrid scan — LLM enricher setup

Quick reference for running `tokenforge scan . --mode hybrid` with a real LLM
backend. See [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) for the full
architecture, candidate-selection rules, and JSON contract — this doc only
covers "what do I set to make `--llm <backend>:<model>` work."

## Backend overview

| Backend | When it's the efficient choice |
| --- | --- |
| `noop` (default) | Zero cost, zero latency, no semantic pass — just the heuristic scan. |
| `ollama` | Private/offline runs at zero API cost; slower on weak local hardware, so timeouts default high (900s). |
| `anthropic` | Best semantic judgment for redundant/contradictory agent instructions; cloud cost per call, short 120s default timeout so failures surface fast. |
| `codex` | Uses the installed Codex CLI and the user's saved ChatGPT login; no API key is handled by TokenForge. |
| `claude-code` | Same judgment as `anthropic`, billed against a Claude Pro/Max plan instead of an API key. Uses the installed Claude Code CLI and its saved login. |
| `cursor-cli` | Uses the installed Cursor CLI (`agent`) and Cursor login or `CURSOR_API_KEY`; best when you already work in Cursor and do not run Ollama or other vendor CLIs. |

## `noop`

Nothing to configure — this is the default for `--mode hybrid` when `--llm`
is omitted.

## `ollama` (local)

```bash
tokenforge scan . --mode hybrid --llm ollama:qwen2.5-coder:7b
```

- `--llm-endpoint <url>` — override the daemon URL (default `http://127.0.0.1:11434`).
- `--llm-timeout <sec>` — per-batch timeout in seconds (default 900).
- `TOKENFORGE_OLLAMA_TIMEOUT_MS` — env var fallback for the same timeout.
- Transient mid-scan disconnects (`fetch failed`, `ECONNRESET`, HTTP 502/503/529)
  are retried a few times with short backoff. Timeouts are not retried. Confirm
  the daemon with `curl -s http://127.0.0.1:11434/api/tags` before a long scan.
- Ollama HTTP calls use undici timeouts aligned to `--llm-timeout` (not the
  default 300s headers wait). Slow local models need a high enough
  `--llm-timeout`; `UND_ERR_HEADERS_TIMEOUT` is treated as a request timeout,
  not a transient retry.
- Pass A (context map) validates JSON strictly and runs one repair prompt if the
  map is unusable (`empty_signal`, `no_known_paths`, etc.). Flat batching is only
  a last resort and skips Pass C — watch for `Pass C skipped` in progress logs.

## `anthropic` (cloud)

```bash
export ANTHROPIC_API_KEY=sk-ant-...
tokenforge scan . --mode hybrid --llm anthropic:claude-sonnet-4-5
```

- `ANTHROPIC_API_KEY` — **required**. Missing or empty raises a clear
  `RuntimeError` before any network call is made.
- `--llm-endpoint <url>` — override the API base URL (default
  `https://api.anthropic.com/v1`).
- `--llm-timeout <sec>` — per-batch timeout in seconds (default 120).
- `TOKENFORGE_ANTHROPIC_TIMEOUT_MS` — env var fallback for the same timeout.

Candidate excerpts leave the machine when using this backend — the CLI prints
a one-time warning to stderr before the first request is sent. Excerpts are
bounded (≤ 30 files, ≤ 32 KiB each) and never include lockfiles or whole
trees; see the "Candidate selection" and "Privacy and cost" sections of
[`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md) for the exact rules.

## `claude-code` (Claude plan through Claude Code CLI)

```bash
npm install -g @anthropic-ai/claude-code
claude            # sign in with /login, then exit the REPL
unset ANTHROPIC_API_KEY
tokenforge scan . --mode hybrid --llm claude-code --allow-external
```

- Install the [Claude Code CLI](https://code.claude.com/docs/en/cli-reference)
  separately and sign in once with `claude` → `/login`.
- `--llm claude-code` respects the model Claude Code is configured with. Use
  `--llm claude-code:<model>` only for an explicit per-scan override, e.g.
  `--llm claude-code:claude-opus-5`.
- `--allow-external` — explicit confirmation that bounded source excerpts may be
  sent to Anthropic through the Claude Code session. Without it, TokenForge
  prints a privacy warning and exits before starting the CLI.
- `--llm-timeout <sec>` — per-batch timeout in seconds (default 180, higher than
  Codex's 120 because a `claude -p` run boots the full session first). Measured
  on Claude Code v2.1.247: ~10s per 4-file batch, so the default is slack, not a
  target.
- `TOKENFORGE_CLAUDE_CODE_TIMEOUT_MS` — env var fallback for the same timeout.
- `TOKENFORGE_CLAUDE_CODE_PATH` — path to the executable when it is not `claude`
  on `PATH`.
- `--llm-endpoint` is **rejected**: the CLI owns its own connection.

**Cost.** Each batch pays for a fresh session prefix — roughly 30K cache-creation
tokens before a single candidate is read, because the run is stateless by design
(no `--resume` between batches). A 12-candidate scan is 3 batches. On a Pro/Max
plan that counts against plan limits rather than a bill, but it is not free, and
it is why `--mode hybrid` stays opt-in.

`ANTHROPIC_API_KEY` and `ANTHROPIC_AUTH_TOKEN` are removed from the child process
environment. Leaving one set would silently move the scan onto usage-based API
billing instead of the plan — this backend exists precisely to avoid that.

TokenForge runs `claude -p` non-interactively from a **new empty temporary
directory**, with `--output-format json --json-schema`,
`--permission-mode dontAsk`, and `--strict-mcp-config`. (`--max-turns` is
documented but absent from the CLI as of v2.1.247, so it is not passed.) The repository path is
never the working directory: a `claude -p` session loads settings, hooks, MCP
servers, and `CLAUDE.md` from its cwd with no trust prompt, so the scanned repo
would otherwise get to configure the process analyzing it. See the "Trust
boundary for CLI backends" section of
[`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md).

## `codex` (ChatGPT account through Codex CLI)

```bash
codex login
tokenforge scan . --mode hybrid --llm codex --allow-external
```

- Install the [Codex CLI](https://developers.openai.com/codex/cli/) separately
  and run `codex login` using the browser-based ChatGPT flow.
- `codex login status` must report ChatGPT authentication. TokenForge rejects
  API-key/access-token authentication for this backend.
- `--llm codex` respects the model configured by Codex. Use
  `--llm codex:<model>` only when an explicit per-scan override is wanted.
- `--llm-timeout <sec>` — per-batch timeout in seconds (default 120).
- `TOKENFORGE_CODEX_TIMEOUT_MS` — env var fallback for the same timeout.
- `TOKENFORGE_CODEX_PATH` — optional path to the Codex executable when it is
  not available as `codex` on `PATH`.
- `--allow-external` — explicit confirmation that bounded source excerpts may
  be sent to OpenAI through Codex. Without it, TokenForge prints a privacy
  warning and exits before starting Codex.

TokenForge invokes `codex exec` non-interactively in a new empty temporary
directory with a read-only sandbox, an ephemeral session, a JSON output schema,
and the bounded enrichment prompt on stdin. The repository path is not exposed
as the Codex working directory. `OPENAI_API_KEY` and `CODEX_API_KEY` are removed
from the child process environment so they cannot silently replace the saved
ChatGPT login with usage-based authentication.

```bash
tokenforge scan . --mode hybrid --llm codex:gpt-5.6-sol --allow-external
```

## `cursor-cli` (Cursor account through Cursor CLI)

```bash
curl https://cursor.com/install -fsS | bash
agent login
tokenforge scan . --mode hybrid --llm cursor-cli --allow-external
```

- Install the [Cursor CLI](https://cursor.com/docs/cli/overview) and sign in
  once with `agent login`, or set `CURSOR_API_KEY` for automation/CI.
- `--llm cursor-cli` uses the default Cursor model for the account. Use
  `--llm cursor-cli:<model>` for an explicit per-scan override, e.g.
  `--llm cursor-cli:composer-2.5`.
- `--allow-external` — explicit confirmation that bounded source excerpts may be
  sent to Cursor's hosted models. Without it, TokenForge prints a privacy
  warning and exits before starting the CLI.
- `--llm-timeout <sec>` — per-batch timeout in seconds (default 180).
- `TOKENFORGE_CURSOR_CLI_TIMEOUT_MS` — env var fallback for the same timeout.
- `TOKENFORGE_CURSOR_CLI_PATH` — path to the executable when it is not `agent`
  on `PATH`.
- `--llm-endpoint` is **rejected**: the CLI owns its own connection.

TokenForge invokes `agent -p` non-interactively with `--output-format json`,
`--mode ask`, and `--trust`, from a **new empty temporary workspace** passed to
`--workspace`. The scanned repository is never the workspace: otherwise
`.cursor/rules`, MCP servers, and `AGENTS.md` from that repo could configure
the agent analyzing it. `--force` / `--yolo` are never passed.
