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
  prove-report [path] Write Markdown Prove report from .tokenforge artifacts
  honor-smoke [path]  Write Cursor host-honor checklist (.tokenforge/honor-smoke.json)
  drift [path]        Check managed policy section still present (local CI)
  promote-shield [path]
                      Merge ignore candidates into provider shield files
  org-seed [path]     Roll up scan JSON files under a directory → BU seed
  prove-pack [path]   Roll up Detect + Prove artifacts → org prove-pack JSON
  inbox-init [dir]    Scaffold inbox/README.md (+ optional tokenforge-roster.json)
  inbox-validate [dir] Validate inbox folders vs roster (exit 2 on failure)
  stage-dashboard [path] Copy prove artifacts → dashboard/public for local boot
  remap-usage         Rename vendor team labels in UsageMetrics JSON
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
    --reasoning-pack <m>          off | roles | roles+persona (default roles)
    --dry-run                     List planned writes without changing files
    --json                        Include totals JSON on stdout

  Example:
    npm run tokenforge -- apply . --mode hybrid --llm cursor-cli:composer-2.5 --allow-external

  Safety: instruction markdown gets a managed <!-- tokenforge:begin/end --> section;
  user text outside the markers is kept. Exclusion YAML may fully replace.

  Shield promotion (explicit — never silent):
    --promote-shield              After apply, merge ignore candidates into shield files
                                  (cursor/copilot/gemini ignore; claude → session-shield)
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

  "org-seed": `tokenforge org-seed [directory] [options]

  Walk a directory tree for .tokenforge/scan-report.json and
  .tokenforge/last-scan.json files, merge them into one dashboard seed JSON
  (businessUnit + reports). Eng-manager handoff for Prove / dashboard ?src=.

  Options:
    --team <name>       Business unit label (default: directory name)
    --out <path>        Output path (default: <directory>/org-seed.json)
    --json              Print rollup metadata + seed JSON

  Example:
    npm run tokenforge -- org-seed ./team-repos --team "Retail Banking" --out ./bu-seed.json
`,

  "prove-pack": `tokenforge prove-pack [directory] [options]

  Walk a directory tree for Detect + Prove artifacts and merge them into one
  org prove-pack JSON (seed, change markers, session stats, discover summaries).
  Eng-manager / director handoff for dashboard ?pack=.

  Collects under each repo:
    scan-report.json / last-scan.json
    prove-change-latest.json
    session-stats.json
    discover-latest.json

  Options:
    --team <name>       Business unit label (default: directory name)
    --out <path>        Output path (default: <directory>/org-prove-pack.json)
    --roster <path>     Optional roster JSON for scan/session coverage gaps
    --json              Print rollup metadata + pack JSON

  Example:
    npm run tokenforge -- prove-pack ./inbox --team "Retail Banking" --roster ./roster.json
`,

  "inbox-init": `tokenforge inbox-init [dir] [options]

  Scaffold an EM inbox: inbox/README.md explaining the layout
  inbox/{team}/{repo}/.tokenforge/ and optional sample tokenforge-roster.json.

  Options:
    --with-roster       Also write tokenforge-roster.json stub at inbox root
    --team <name>       Business unit label for roster stub
    --json              Print { root, readmePath, rosterPath? }

  Example:
    npm run tokenforge -- inbox-init ./bu-inbox --with-roster --team "Retail Banking"
`,

  "inbox-validate": `tokenforge inbox-validate [dir] [options]

  Walk inbox folders for scan/session artifacts; compare vs roster when given.
  Reports missing teams, local/default/empty team labels, and stale mtimes.

  Options:
    --roster <path>     tokenforge-roster.json for coverage checks
    --stale-days <n>    Stale threshold in days (default: 7)
    --json              Print validation result JSON

  Exit codes: 0 OK · 2 validation failures

  Example:
    npm run tokenforge -- inbox-validate ./bu-inbox --roster ./tokenforge-roster.json
`,

  "stage-dashboard": `tokenforge stage-dashboard [path] [options]

  Copy org prove-pack / seed / last-scan / markers / session / discover into
  dashboard/public for local Vite boot.

  Path may be org-prove-pack.json, org-seed.json, or a directory (repo or inbox).

  Options:
    --public-dir <path> Override dashboard/public (default: <cwd>/dashboard/public)
    --json              Print { publicDir, copied, bootUrl }

  Example:
    npm run tokenforge -- stage-dashboard ./org-prove-pack.json
    npm run tokenforge -- stage-dashboard ./bu-inbox --public-dir ./dashboard/public
`,

  "remap-usage": `tokenforge remap-usage [options]

  Rename vendor FinOps team labels to TokenForge team ids in a UsageMetrics JSON
  file using a usage team map ({ schemaVersion: 1, map: { … } }).

  Options:
    --map <path>        Usage team map JSON (required)
    --in <path>         Input UsageMetrics JSON (or positional path)
    --out <path>        Output path (required)
    --json              Print remap metadata + metrics

  Example:
    npm run tokenforge -- remap-usage --map ./usage-team-map.json --in ./usage-2026-08.json --out ./usage-remapped.json
`,

  pilot: `tokenforge pilot [path] [options]

  Org pilot pack: scan → apply → Prove-ready artifacts.

  Options:
    --provider copilot            Provider adapter
    --skip-apply                  Scan only
    --prove                       Write .tokenforge/prove-handoff.json, stage
                                  dashboard/public, print dashboard URL with
                                  ?src=&afterUsage=&markers=&session=
    --dry-run                     Preview steps without writing
    --mode / --llm / --allow-external
                                  Passed through to scan
`,

  "prove-report": `tokenforge prove-report [path] [options]

  Director-forwardable Markdown Prove report from local .tokenforge artifacts.
  Includes estimated scan savings, Fix marker, usage/variance when local usage
  snapshots exist, trust/cohort notes, and calibration band
  (estimated ≠ billed causation).

  Options:
    --out <path>                  Output path (default: .tokenforge/prove-report.md)
    --json                        Print { outPath, reportPath }
`,

  "honor-smoke": `tokenforge honor-smoke [path] [options]

  Write a host-honor verification checklist for Cursor Soft
  (.cursorindexingignore) and Hard (.cursorignore) shields.

  Honesty: observes whether the host appears to honor ignore files on this
  machine — not metering of any agent private context pipeline.

  Options:
    --out <path>                  Output path (default: .tokenforge/honor-smoke.json)
    --json                        Print { outPath, modes }

  Example:
    npm run tokenforge -- honor-smoke fixtures/noisy-app
`,

  drift: `tokenforge drift [path] [options]

  Local CI check: ensure the provider instruction file still contains a
  non-empty <!-- tokenforge:begin/end --> managed section (not reverted).
  When .tokenforge/apply-section-hash.json exists, also compares the managed
  section body hash to the last apply (status hash_mismatch).

  Options:
    --provider copilot            Adapter whose instruction path to check
                                  (copilot | cursor | claude | gemini | generic)
    --json                        Print status JSON

  Exit codes: 0 section OK · 2 missing file / missing or empty section / hash_mismatch

  Example (CI):
    npm run tokenforge -- drift . --provider claude
`,

  "promote-shield": `tokenforge promote-shield [path] [options]

  Explicitly merge apply-generated ignore candidates into provider shield files.
  Never silent — prints every pattern promoted.

  Options:
    --provider cursor             Default. cursor/copilot/gemini → ignore files;
                                  claude → advisory session-shield.json
    --dry-run                     Preview merge without writing

  Example:
    npm run tokenforge -- apply . --provider cursor --promote-shield
    npm run tokenforge -- promote-shield . --provider gemini --dry-run
`,

  hybrid: `Hybrid scan — optional LLM enrichment on bounded candidate excerpts

  Use with: tokenforge scan … --mode hybrid --llm <spec> --allow-external

  Privacy / honesty:
    • Default scan is heuristic only — no AI, no data leaves the machine.
    • External CLI/API backends (anthropic, codex, claude-code, cursor-cli,
      gemini-cli) send bounded excerpts or a sanitized repo copy (Codex).
    • --allow-external is required — explicit confirmation excerpts may leave
      this machine. Same gate as extension tokenforge.allowExternalLlm.
    • Ollama and noop stay local; no --allow-external needed.
    • TokenForge does not intercept any vendor's private context pipeline.

  LLM backends:
    noop                        Default. No LLM calls.
    ollama:<model>              Local Ollama model
    anthropic:<model>           Anthropic API (requires --allow-external)
    codex                       OpenAI Codex CLI
    claude-code                 Claude Code CLI
    gemini-cli                  Gemini CLI
    cursor-cli[:model]          Cursor CLI (agent login or CURSOR_API_KEY)

  Notes:
    • Heuristic token math stays authoritative; models add semantic findings.
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
      `Unknown help topic "${topic}". Try: scan, apply, init, discover, pilot, org-seed, prove-pack, inbox-init, inbox-validate, stage-dashboard, remap-usage, prove-report, honor-smoke, drift, promote-shield, hybrid, mcp\n`,
    );
  }
}

/** Compact usage string appended to usage errors. */
export const USAGE_HINT = "Run tokenforge --help or tokenforge help <command> for usage.\n";
