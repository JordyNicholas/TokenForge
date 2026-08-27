import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  TOKENFORGE_APPLY_TOOL,
  TOKENFORGE_SCAN_TOOL,
  defaultMcpToolDeps,
  handleTokenforgeApply,
  handleTokenforgeScan,
  tokenforgeApplyInputSchema,
  tokenforgeScanInputSchema,
  type McpToolDeps,
} from "./tools.js";

function toolText(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: "text" as const, text: message }],
  };
}

export function createTokenforgeMcpServer(
  deps: McpToolDeps = defaultMcpToolDeps(),
): McpServer {
  const server = new McpServer(
    {
      name: "tokenforge",
      version: "0.0.0",
    },
    {
      instructions:
        "TokenForge Detect and Fix for metered AI coding agents. " +
        "Use tokenforge_scan to score a repository and write .tokenforge/scan-report.json. " +
        "Use tokenforge_apply to write provider policy files from the latest scan. " +
        "Hybrid enrichers that send excerpts off-machine require allowExternal: true.",
    },
  );

  server.registerTool(
    TOKENFORGE_SCAN_TOOL,
    {
      description:
        "Run TokenForge scan on a repository root and write .tokenforge/scan-report.json.",
      inputSchema: tokenforgeScanInputSchema,
    },
    async (args) => {
      try {
        const payload = await handleTokenforgeScan(args, deps);
        return toolText(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return toolError(message);
      }
    },
  );

  server.registerTool(
    TOKENFORGE_APPLY_TOOL,
    {
      description:
        "Apply TokenForge Fix policy files for a provider from the latest scan report.",
      inputSchema: tokenforgeApplyInputSchema,
    },
    async (args) => {
      try {
        const payload = await handleTokenforgeApply(args, deps);
        return toolText(payload);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return toolError(message);
      }
    },
  );

  return server;
}

/** Start the TokenForge MCP server on stdio until the client disconnects. */
export async function runMcpServer(
  deps: McpToolDeps = defaultMcpToolDeps(),
): Promise<void> {
  const server = createTokenforgeMcpServer(deps);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
