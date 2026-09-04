import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  isProveChangeMarker,
  isTokenRiskReport,
  type ProveChangeMarker,
  type TokenRiskReport,
} from "@tokenforge/risk-core";
import { proveChangeLatestPath, proveReportPath, scanReportPath } from "../../io/paths";

const HONESTY =
  "Fix-on vs control is billed usage compare for teams with vs without a Fix apply marker — not proof that TokenForge caused 100% of any invoice delta.";

export type ProveReportResult = {
  reportPath: string;
  markdown: string;
  outPath: string;
};

function formatTokens(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Director-forwardable Markdown Prove report from local .tokenforge artifacts.
 * Honesty: estimated ≠ billed causation.
 */
export async function writeProveReport(options: {
  root: string;
  outPath?: string;
}): Promise<ProveReportResult> {
  const root = resolve(options.root);
  const reportFile = scanReportPath(root);
  const raw = await readFile(reportFile, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (!isTokenRiskReport(parsed)) {
    throw new Error(`${reportFile} is not a Token Risk report.`);
  }
  const report: TokenRiskReport = parsed;

  let marker: ProveChangeMarker | null = null;
  try {
    const markerRaw = JSON.parse(await readFile(proveChangeLatestPath(root), "utf8"));
    if (isProveChangeMarker(markerRaw)) {
      marker = markerRaw;
    }
  } catch {
    marker = null;
  }

  const savedPct =
    report.totals.beforeTokens > 0
      ? (100 * report.totals.savedTokens) / report.totals.beforeTokens
      : 0;

  const markdown = `# TokenForge Prove report

Generated: ${new Date().toISOString()}  
Team: **${report.team}** · Repo: **${report.repo}** · Provider: **${report.provider}**

## Estimated scan savings

| Metric | Value |
| --- | --- |
| Before tokens | ${formatTokens(report.totals.beforeTokens)} |
| After tokens | ${formatTokens(report.totals.afterTokens)} |
| Saved tokens | ${formatTokens(report.totals.savedTokens)} |
| Scan exclusion | ${savedPct.toFixed(1)}% |

## Fix attribution

${
  marker
    ? `- Pack: \`${marker.packId}\`  
- Action: ${marker.action}  
- Timestamp: ${marker.timestamp}  
- Team: ${marker.team ?? report.team}`
    : "_No Prove change marker found. Run \`tokenforge apply\` or \`tokenforge pilot\`._"
}

## Billed usage reconcile

Import baseline + after-period usage in the dashboard Variance board (or pass \`?usage=\` / \`?afterUsage=\`).  
Scenario $ uses editable Assumptions — not a vendor billing API.

## Honesty

${HONESTY}

Estimated avoided context is **not** an invoice causation claim. Cohort Fix-on vs control reduces noise; it does not prove 100% of any billed delta was caused by TokenForge.

---
_Local-first TokenForge Prove — forward this Markdown to FinOps._
`;

  const outPath = resolve(options.outPath ?? proveReportPath(root));
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, markdown, "utf8");
  return { reportPath: reportFile, markdown, outPath };
}
