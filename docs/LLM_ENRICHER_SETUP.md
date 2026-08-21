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
