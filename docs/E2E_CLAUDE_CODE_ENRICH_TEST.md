# End-to-end test — `claude-code` enricher (manual, not CI)

Verification runbook for the `claude-code` hybrid backend, which drives the
Claude Code CLI on its **subscription login** instead of `ANTHROPIC_API_KEY`.

**This is deliberately not in CI.** It spends real plan quota, needs an
interactive login, and LLM output is non-deterministic — the same reasons
`--mode hybrid` is excluded from the CI gate in
[`PROJECT_PR_WORKFLOW.md`](./PROJECT_PR_WORKFLOW.md). The adapter's own
behaviour is covered by unit tests with an injected command runner
(`packages/enrichers/src/claude-code/`); what this document covers is the part
those tests structurally cannot: whether the flags exist and the envelope parses.

Related: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md),
[`LLM_ENRICHER_SETUP.md`](./LLM_ENRICHER_SETUP.md).

## Why this document exists

The first implementation of this backend passed `--max-turns 1`, taken from the
published CLI reference. The flag does not exist in the binary. Every unit test
passed, because they all inject a fake runner — the failure only appears when a
real `claude` is spawned. **Re-run this after any change to the invocation, and
after a Claude Code upgrade.**

## Prerequisites

| Requirement | Check |
| --- | --- |
| Node.js 20+ | `node -v` |
| Dependencies built | `npm install && npm run build` |
| Claude Code CLI | `claude --version` |
| Signed in | `claude` → `/login` → exit the REPL |
| No API key in env | `echo $ANTHROPIC_API_KEY` prints nothing (see step 5) |

```bash
npm install -g @anthropic-ai/claude-code
claude          # /login, then exit
```

If `claude` is not on `PATH`, set `TOKENFORGE_CLAUDE_CODE_PATH` to its full path
instead of adding it to `PATH`.

## 0. Flag existence — do this first

The cheapest check, and the one that caught the real bug. It spends nothing.

```bash
claude --version
for f in --output-format --json-schema --permission-mode --strict-mcp-config --model; do
  claude --help | grep -q -- "$f" && echo "PRESENT $f" || echo "MISSING $f"
done
```

Every flag must be `PRESENT`. The invocation is built in `claudeCodeArgs()`
(`packages/enrichers/src/claude-code/claude-code.ts`); if a flag has
disappeared, that function is what needs updating.

Also confirm `--permission-mode` still accepts `dontAsk`:

```bash
claude --help | grep -A3 -- "--permission-mode"
```

## 1. Happy path

`fixtures/monorepo-config-app` is the right fixture because it carries both a
true positive (three `tsconfig.json` copies) and the standing false-positive
control (a `package.json` trio that is legitimately similar).

```bash
node cli/bin/tokenforge.mjs scan fixtures/monorepo-config-app \
  --mode hybrid --llm claude-code --allow-external
```

Expected — 12 candidates, 3 batches:

```text
tokenforge: Claude Code enricher: batch 1/3 (4 file(s), timeout 180s per batch)…
tokenforge: Claude Code enricher: finished in 20s (2 finding(s)).

PATH                      REASON            TOKENS  ACTION
packages/c/tsconfig.json  redundant_config     128  kept
packages/b/tsconfig.json  redundant_config      80  kept

savedTokens      0
```

> **`scan` exits 3 here, and that is a pass.** `savingsExitCode` returns 3
> whenever `savedTokens` is 0, and `redundant_config` is advisory, so this
> fixture can never save a token. Do not chain these commands with `&&`, and do
> not read the exit code as the health of the enricher — read the findings
> table. `fixtures/active-session-app` (step 4 onward) does have exclusions and
> exits 0.

Three things to check, in order of what is most likely to be wrong:

1. **No finding names a `package.json`.** That trio is the false-positive
   control: routing selects it (routing is by basename), and keeping the model
   off it is the prompt's job. A finding here means the prompt guard regressed.
2. **`savedTokens` is 0 and both actions are `kept`.** `redundant_config` is
   advisory by construction — every package still loads its own copy at build
   time, so excluding one from agent context fixes nothing.
3. **The `detail` explains *why*, not just *that*.** A good run recognises
   semantic rather than textual duplication. On the reference run it noted that
   `"strict": true` expanded into its eight constituent flags, with different
   key order and enum casing, is the same configuration.

## 2. The report contract

```bash
node --input-type=module -e '
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {readFileSync} from "node:fs";
const live=JSON.parse(readFileSync("docs/schemas/risk-event.schema.json","utf8"));
const v4=JSON.parse(readFileSync("docs/schemas/risk-event.v4.schema.json","utf8"));
const r=JSON.parse(readFileSync("fixtures/monorepo-config-app/.tokenforge/scan-report.json","utf8"));
const ajv=new Ajv2020({allErrors:true,strict:true}); addFormats.default(ajv);
console.log("backend:", r.scan.llm.backend);
console.log("valid under live schema:", ajv.compile(live)(r));
console.log("rejected by frozen v4 :", !ajv.compile(v4)(r));
'
```

All three must hold. The last one is the point: a real report exercises the v5
enum from #146, so the bump is verified by an artifact rather than by a fixture
written to match it.

Run this as its own command — the scan above exited 3, so an `&&` between them
silently skips this step.

## 3. Consent gate

```bash
node cli/bin/tokenforge.mjs scan fixtures/monorepo-config-app \
  --mode hybrid --llm claude-code
echo "exit=$?"
```

Expected: exit **2**, the privacy warning on stderr, and `Review the privacy
warning and rerun with --allow-external.` Nothing is spawned — an
unauthenticated or uninstalled CLI must still produce *this* message, not an
install error.

## 4. Timeout

```bash
TOKENFORGE_CLAUDE_CODE_TIMEOUT_MS=10000 \
  node cli/bin/tokenforge.mjs scan fixtures/active-session-app \
  --mode hybrid --llm claude-code --allow-external
```

Expected:
`Claude Code CLI enrichment timed out after 10s. Retry with a higher --llm-timeout…`

10s is below any real batch, so this reliably trips. Confirms the timeout kills
the child rather than hanging the scan.

## 5. Credential stripping — the security claim

The backend's whole premise is that it uses the plan, not an API key. Test it by
poisoning the environment: if the key leaked into the child, the CLI would
authenticate with it and **fail**.

```bash
ANTHROPIC_API_KEY=sk-ant-INVALID-KEY \
ANTHROPIC_AUTH_TOKEN=also-bogus \
  node cli/bin/tokenforge.mjs scan fixtures/active-session-app \
  --mode hybrid --llm claude-code --allow-external
```

Expected: the scan **succeeds**. A success proves the strip worked; an auth
error proves it did not. There is no third outcome, which is what makes this a
real test rather than a smoke check.

## 6. Remaining paths

```bash
# Missing binary → install guidance, not a stack trace
TOKENFORGE_CLAUDE_CODE_PATH=/no/such/claude \
  node cli/bin/tokenforge.mjs scan fixtures/active-session-app \
  --mode hybrid --llm claude-code --allow-external
#   → "Claude Code CLI is not installed or is not available on PATH."

# Endpoint override is rejected: the CLI owns its connection
node cli/bin/tokenforge.mjs scan fixtures/active-session-app \
  --mode hybrid --llm claude-code --allow-external \
  --llm-endpoint https://api.anthropic.com/v1
#   → "--llm-endpoint is not supported by the Claude Code CLI backend."

# The likely typo
node cli/bin/tokenforge.mjs scan fixtures/active-session-app --mode hybrid --llm claude
#   → 'Did you mean "claude-code"?'

# Explicit model override
node cli/bin/tokenforge.mjs scan fixtures/active-session-app \
  --mode hybrid --llm claude-code:claude-haiku-4-5 --allow-external
```

## 7. Clean up

`.tokenforge/` is gitignored, but a stale report confuses the next run:

```bash
rm -rf fixtures/*/.tokenforge
```

## Reference run

Recorded so a later run has something to diverge from.

| | |
| --- | --- |
| Claude Code | **2.1.247** |
| Date | 2026-08-27 |
| Platform | Windows 11, Node 24.19.0 |
| Fixture | `fixtures/monorepo-config-app` (12 candidates → 3 batches) |
| Wall time | 20–31s for the whole scan |
| Findings | 2 × `redundant_config`, both `kept`, `savedTokens` 0 |
| False positives | none (`package.json` trio clean) |

**Cost per batch.** ~30K cache-creation tokens before a single candidate is
read, plus a few hundred output tokens. Batches are stateless by design — no
`--resume` — so each pays for its own session prefix. That is the concrete
reason `--mode hybrid` stays opt-in, and the number to watch if
`CLAUDE_CODE_BATCH_SIZE` is ever retuned.

### Envelope shape

Trimmed to the fields the adapter reads (`extractStructuredPayload`). Confirmed
against v2.1.247:

```json
{
  "type": "result",
  "subtype": "success",
  "is_error": false,
  "result": "{\"findings\":[...]}",
  "structured_output": { "findings": [] },
  "session_id": "2480ff6f-…",
  "total_cost_usd": 0.302819,
  "usage": { "cache_creation_input_tokens": 29996, "output_tokens": 75 }
}
```

`--json-schema` puts the validated object on **`structured_output`**; `result`
carries the same content as a string. The adapter prefers `structured_output`
and falls back to parsing `result`, so a CLI old enough to ignore the schema
still works.

An in-run failure — missing authentication above all — arrives as
`is_error: true` with the reason in `result`, **at exit code 0**. That is why the
adapter checks the envelope rather than trusting the exit code alone.
