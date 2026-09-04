type HelpIo = {
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
};

const MAIN_HELP = `TokenForge — Detect, Fix, and Prove token waste in AI coding agents

Usage:
  tokenforge <command> [path] [options]
  npm run tokenforge -- <command> [path] [options]

Getting started:
  tokenforge init .                 Bootstrap .tokenforge/, scan, and apply fixes
  tokenforge scan .                 Find high-risk paths; write scan report
  tokenforge apply .                Write lean instructions and exclusion candidates

Commands:
  scan [path]         Score token waste → .tokenforge/scan-report.json
  apply [path]        Apply provider adapter (instructions + exclusions)
  init [path]         First-time repo setup (scan + apply; use --skip-apply for scan only)
  discover [path]     Find missed savings vs on-disk exclusions
  pilot [path]        Org pilot pack: scan → apply → Prove-ready
  org-pack <seed>     Aggregate a multi-team seed into .tokenforge/org-policy/
  org-apply [path]    Stage / push org content exclusions (requires --org)
  usage-pull          Fetch billed usage into UsageMetrics JSON
  usage-sync [path]   Pull usage via UsageProvider into .tokenforge/
  mcp                 Start the TokenForge MCP server on stdio
  help [command]      Show this overview or help for one command

Common options (most commands):
  --team <name>       Team label (default: local)
  --repo <name>       Repo label (default: directory name)
  --provider <id>     copilot | cursor | claude | gemini | generic
  --dry-run           Show planned writes without changing files
  --json              Print machine-readable JSON to stdout
  -h, --help          Show help

Scan / init — detection mode:
  --mode heuristic    Default. Fast local rules; no data leaves the machine.
  --mode hybrid       Heuristic scan + optional LLM enrichment on bounded excerpts.
  --llm <spec>        Hybrid only. e.g. cursor-cli, cursor-cli:composer-2.5, ollama:qwen2.5-coder:7b
  --allow-external    Required for hybrid when using anthropic or any CLI backend
  --llm-timeout <s>   Per-batch LLM timeout in seconds (backend-specific default)
  --active-paths-file <path>
                      JSON array or last-scan report; those paths are never excluded

Examples:
  npm run tokenforge -- scan fixtures/noisy-app
  npm run tokenforge -- scan . --mode hybrid --llm cursor-cli --allow-external
  npm run tokenforge -- init . --provider copilot
  npm run tokenforge -- apply . --dry-run
  npm run tokenforge -- help scan

Exit codes: 0 saved tokens > 0 · 1 runtime error · 2 usage error · 3 saved tokens = 0
`;

const COMMAND_HELP: Record<string, string> = {
  scan: `tokenforge scan [path] [options]

  Score high-risk paths and write .tokenforge/scan-report.json.

  Options:
    --mode heuristic | hybrid     Detection mode (default: heuristic)
    --llm <backend[:model]>       Hybrid enricher (see: tokenforge help hybrid)
    --allow-external              Confirm excerpts may leave this machine
    --llm-endpoint <url>          Override Ollama / Anthropic API base URL
    --llm-timeout <seconds>       Per-batch LLM timeout
    --active-paths-file <path>    Protect listed paths from exclusion proposals
    --provider generic            Default provider for the report
    --json                        Print totals JSON to stdout

  Example:
    npm run tokenforge -- scan . --mode hybrid --llm cursor-cli:composer-2.5 --allow-external
`,

  apply: `tokenforge apply [path] [options]

  Write agent policy pack: managed instruction section + exclusion candidates.

  Options:
    --provider copilot            Default apply adapter (copilot | cursor | claude | gemini | generic)
    --mode heuristic | hybrid     Policy synthesis mode (default: heuristic)
    --llm <backend[:model]>       Hybrid apply — compiles scan JSON into policy text
    --allow-external              Required for hybrid apply with vendor CLI backends
    --policy-max-bytes <n>        Override managed section byte budget
    --dry-run                     List planned writes without changing files
    --json                        Include totals JSON on stdout

  Example:
    npm run tokenforge -- apply . --mode hybrid --llm cursor-cli:composer-2.5 --allow-external

  Safety: instruction markdown gets a managed <!-- tokenforge:begin/end --> section;
  user text outside the markers is kept. Exclusion YAML may fully replace.
`,

  init: `tokenforge init [path] [options]

  Bootstrap .tokenforge/, run scan, then apply (unless --skip-apply).

  Options:
    --skip-apply                  Scan only; still writes the scan report
    --mode / --llm / --allow-external
                                  Same as scan (init runs scan first)
    --provider copilot            Apply adapter (default: copilot)
    --dry-run                     Preview without writing

  Example:
    npm run tokenforge -- init . --provider cursor
`,

  discover: `tokenforge discover [path] [options]

  Compare the saved scan report with on-disk exclusions to find missed savings.

  Options:
    --report <path>               Input Token Risk JSON (default: .tokenforge/scan-report.json)
    --rescan                      Run a fresh scan instead of reusing the saved report
    --provider copilot            Provider context for exclusion paths
    --json                        Print opportunities JSON
`,

  pilot: `tokenforge pilot [path] [options]

  Org pilot pack: scan → apply → Prove-ready artifacts.

  Options:
    --provider copilot            Provider adapter
    --skip-apply                  Scan only
    --dry-run                     Preview steps without writing
    --mode / --llm / --allow-external
                                  Passed through to scan
`,

  hybrid: `Hybrid scan — optional LLM enrichment on bounded candidate excerpts

  Use with: tokenforge scan … --mode hybrid --llm <spec> --allow-external

  LLM backends:
    noop                        Default. No LLM calls.
    ollama:<model>              Local Ollama model
    anthropic:<model>           Anthropic API (requires --allow-external)
    codex                       OpenAI Codex CLI
    claude-code                 Claude Code CLI
    gemini-cli                  Gemini CLI
    cursor-cli[:model]          Cursor CLI (agent login or CURSOR_API_KEY)

  Notes:
    • Default scan is heuristic only — no AI, no data leaves the machine.
    • CLI backends require --allow-external (privacy confirmation).
    • See docs/adapters/LLM_ENRICHER_SETUP.md for setup per backend.
`,

  mcp: `tokenforge mcp

  Start the TokenForge MCP server on stdio for agent CLIs (Cursor, etc.).
  Exposes scan / apply tools to connected agents.

  See docs/adapters/AGENT_MCP_SETUP.md for configuration.
`,
};

export function printHelp(io: HelpIo, topic?: string): void {
  const normalized = topic?.trim().toLowerCase();
  if (normalized && COMMAND_HELP[normalized]) {
    io.stdout.write(`${COMMAND_HELP[normalized]}\n`);
    return;
  }

  io.stdout.write(MAIN_HELP);

  if (normalized && normalized !== "help") {
    io.stderr.write(
      `Unknown help topic "${topic}". Try: scan, apply, init, discover, pilot, hybrid, mcp\n`,
    );
  }
}

/** Compact usage string appended to usage errors. */
export const USAGE_HINT = "Run tokenforge --help or tokenforge help <command> for usage.\n";
