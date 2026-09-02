import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import {
  getAdapter,
  mergeTokenForgeSection,
  type PolicyFile,
} from "@tokenforge/policy-adapters";
import type { TokenRiskReport } from "@tokenforge/risk-core";
import { window } from "vscode";

export type CompactRulesPreview = {
  files: PolicyFile[];
  resolved: PolicyFile[];
};

async function readIfExists(root: string, rel: string): Promise<string | null> {
  try {
    return await readFile(join(root, rel), "utf8");
  } catch {
    return null;
  }
}

/** Dry-run Fix policy files from a scan report (no writes). */
export async function previewCompactRules(
  root: string,
  report: TokenRiskReport,
): Promise<CompactRulesPreview> {
  const adapter = getAdapter(report.provider);
  const planned = adapter.render(report);
  const resolved: PolicyFile[] = [];

  for (const file of planned) {
    if (file.writeMode === "merge-section") {
      const existing = await readIfExists(root, file.path);
      const merged = mergeTokenForgeSection(existing, file.contents);
      resolved.push({
        path: file.path,
        contents: merged.contents,
        writeMode: file.writeMode,
      });
    } else {
      resolved.push(file);
    }
  }

  return { files: planned, resolved };
}

/** Apply compact rules policy pack to workspace (managed sections only). */
export async function applyCompactRules(
  root: string,
  report: TokenRiskReport,
): Promise<string[]> {
  const { resolved } = await previewCompactRules(root, report);
  const written: string[] = [];

  for (const file of resolved) {
    const abs = join(root, file.path);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, file.contents, "utf8");
    written.push(file.path);
  }

  return written;
}

export async function showCompactRulesPreviewMessage(
  preview: CompactRulesPreview,
): Promise<boolean> {
  const summary = preview.resolved
    .map((f) => `${f.path} (${f.contents.length} bytes)`)
    .join("\n");
  const choice = await window.showInformationMessage(
    `Compact rules would update ${preview.resolved.length} file(s).`,
    { modal: true, detail: summary.slice(0, 2000) },
    "Apply",
    "Cancel",
  );
  return choice === "Apply";
}
