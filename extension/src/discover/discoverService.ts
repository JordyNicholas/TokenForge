import { readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import { auditMcpConfigs, type McpAuditFinding } from "./mcpAudit";
import { monorepoScopeHint, type MonorepoHint } from "./monorepoHints";

export type DiscoverCandidate = {
  path: string;
  delta: "added" | "changed";
  score: number;
  kind?: "file" | "mcp" | "monorepo";
  note?: string;
};

const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".tokenforge"]);

/** Delta scan + MCP audit + optional monorepo scope hint. */
export async function discoverRecentChanges(
  root: string,
  options: { maxResults?: number; sinceMs?: number; editorPath?: string } = {},
): Promise<DiscoverCandidate[]> {
  const maxResults = options.maxResults ?? 12;
  const sinceMs = options.sinceMs ?? 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - sinceMs;
  const found: DiscoverCandidate[] = [];

  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const abs = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) {
          continue;
        }
        await walk(abs);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      let mtimeMs = 0;
      let size = 0;
      try {
        const info = await stat(abs);
        mtimeMs = info.mtimeMs;
        size = info.size;
      } catch {
        continue;
      }
      if (mtimeMs < cutoff) {
        continue;
      }
      const rel = relative(root, abs).replaceAll("\\", "/");
      found.push({
        path: rel,
        delta: "changed",
        score: Math.min(100, Math.round(size / 1024) + (mtimeMs - cutoff) / sinceMs),
        kind: "file",
      });
    }
  }

  await walk(root);

  const mcpFindings: McpAuditFinding[] = await auditMcpConfigs(root);
  for (const finding of mcpFindings) {
    found.push({
      path: finding.path,
      delta: "changed",
      score: finding.score,
      kind: "mcp",
      note: finding.issue,
    });
  }

  if (options.editorPath) {
    const hint: MonorepoHint | undefined = monorepoScopeHint(root, options.editorPath);
    if (hint) {
      found.push({
        path: hint.packageRoot,
        delta: "changed",
        score: 55,
        kind: "monorepo",
        note: hint.note,
      });
    }
  }

  return found.sort((a, b) => b.score - a.score).slice(0, maxResults);
}
