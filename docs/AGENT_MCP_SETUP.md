# Agent MCP setup

TokenForge exposes a thin **MCP server** over the existing CLI commands so agent
workflows can run Detect and Fix without importing vendor SDKs into `risk-core`.

## Start the server

```bash
tokenforge mcp
```

The process speaks MCP over **stdio** and blocks until the host disconnects.

## Tools

| Tool | Maps to | Purpose |
| --- | --- | --- |
| `tokenforge_scan` | `tokenforge scan` | Score a repository and write `.tokenforge/scan-report.json` |
| `tokenforge_apply` | `tokenforge apply` | Write provider policy files from the latest scan |

Both tools accept an optional `root` (defaults to the MCP server's working
directory). Hybrid enrichers that send bounded excerpts off-machine require
`allowExternal: true` in the tool arguments — the same honesty gate as
`--allow-external` on the CLI.

## Cursor

Add a project or user MCP entry:

```json
{
  "mcpServers": {
    "tokenforge": {
      "command": "tokenforge",
      "args": ["mcp"]
    }
  }
}
```

Then ask the agent to call `tokenforge_scan` on the workspace root before
discussing context savings, or `tokenforge_apply` after a scan when you want Fix
policy files written.

## Claude Code

In `.mcp.json` (or your org's MCP config):

```json
{
  "mcpServers": {
    "tokenforge": {
      "command": "tokenforge",
      "args": ["mcp"]
    }
  }
}
```

Restart the session so Claude Code picks up the server. The tools are
provider-agnostic; Fix still writes through the selected `provider` argument.

## Demo prompt

> Run `tokenforge_scan` on this repository with `mode: "heuristic"`, then
> summarize `savedTokens` and the top three findings from the tool result.

For hybrid enrichment with a signed-in Gemini CLI:

> Run `tokenforge_scan` with `mode: "hybrid"`, `llm: "gemini-cli"`, and
> `allowExternal: true`.

## Boundaries

- TokenForge does **not** intercept any vendor Chat/Agent private context pipeline.
- MCP tools call the same ports/adapters as the CLI; they do not bypass Fix
  adapter ownership of provider policy files.
- Session export (`.tokenforge/session-stats.json`) remains an extension handoff;
  use the IDE Context Guard panel or export setting for Prove session evidence.

Related: [`HYBRID_SCAN_DESIGN.md`](./HYBRID_SCAN_DESIGN.md), [`PILOT_RUNBOOK.md`](./PILOT_RUNBOOK.md).
