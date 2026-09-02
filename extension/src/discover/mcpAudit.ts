import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type McpAuditFinding = {
  path: string;
  issue: string;
  score: number;
};

const MCP_PATHS = [".cursor/mcp.json", ".vscode/mcp.json"];

/** Heuristic MCP config audit — description bloat and duplicate server names. */
export async function auditMcpConfigs(root: string): Promise<McpAuditFinding[]> {
  const findings: McpAuditFinding[] = [];

  for (const rel of MCP_PATHS) {
    let raw: string;
    try {
      raw = await readFile(join(root, rel), "utf8");
    } catch {
      continue;
    }

    if (raw.length > 8_000) {
      findings.push({
        path: rel,
        issue: "Large MCP config may inflate agent tool schema context",
        score: 70,
      });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      findings.push({ path: rel, issue: "Invalid JSON in MCP config", score: 50 });
      continue;
    }

    const servers =
      typeof parsed === "object" &&
      parsed !== null &&
      "mcpServers" in parsed &&
      typeof (parsed as { mcpServers: unknown }).mcpServers === "object"
        ? (parsed as { mcpServers: Record<string, unknown> }).mcpServers
        : {};

    const names = Object.keys(servers);
    if (names.length > 6) {
      findings.push({
        path: rel,
        issue: `${names.length} MCP servers — consider disabling unused tools`,
        score: 60,
      });
    }
  }

  return findings.sort((a, b) => b.score - a.score);
}
