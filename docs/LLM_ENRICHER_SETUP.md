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
| `openai` | Not yet implemented (tracked in [#45](https://github.com/JordyNicholas/TokenForge/issues/45)) — will cover OpenAI-compatible hosted/self-hosted endpoints. |

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

## `openai` (not yet available)

Stubbed — selecting `--llm openai:<model>` currently throws a usage error.
Tracked in [#45](https://github.com/JordyNicholas/TokenForge/issues/45).
