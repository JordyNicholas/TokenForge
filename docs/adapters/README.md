# Adapter documentation

**Status:** Locked  
**Scope:** Setup and behavior for each delivery surface (extension, MCP, enrichers).  
**Audience:** Developers integrating or extending adapters.  
**Companion:** [`../design/SOLUTION_DESIGN.md`](../design/SOLUTION_DESIGN.md#architecture)

| Doc | Surface |
| --- | --- |
| [EXTENSION_CONTEXT_GUARD.md](./EXTENSION_CONTEXT_GUARD.md) | VS Code extension — Detect |
| [LLM_ENRICHER_SETUP.md](./LLM_ENRICHER_SETUP.md) | CLI/extension hybrid backends |
| [AGENT_MCP_SETUP.md](./AGENT_MCP_SETUP.md) | MCP server (`tokenforge mcp`) |

Fix adapters (Copilot, Cursor, Claude, generic) are documented in [`../design/SOLUTION_DESIGN.md`](../design/SOLUTION_DESIGN.md) and implemented under `cli/src/adapters/`.
