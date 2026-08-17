import type { TokenRiskReport } from "@tokenforge/risk-core";
import type { ScanResult } from "./scan";

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : `${" ".repeat(width - value.length)}${value}`;
}

/** Human-readable findings table plus token totals. */
export function formatScanTable(result: ScanResult): string {
  const { report, assessments } = result;
  const headers = ["PATH", "REASON", "TOKENS", "ACTION"] as const;
  const rows = report.findings.map((finding) => [
    finding.path,
    finding.reason,
    String(finding.estTokens),
    finding.action,
  ]);

  const widths = headers.map((header, index) =>
    Math.max(header.length, ...rows.map((row) => row[index]?.length ?? 0)),
  );

  const lines = [
    headers.map((header, index) => pad(header, widths[index] ?? 0)).join("  "),
    headers.map((_, index) => "-".repeat(widths[index] ?? 0)).join("  "),
    ...rows.map((row) =>
      row
        .map((cell, index) =>
          index === 2
            ? padLeft(cell, widths[index] ?? 0)
            : pad(cell, widths[index] ?? 0),
        )
        .join("  "),
    ),
  ];

  if (rows.length === 0) {
    lines.push("(no at-risk paths)");
  }

  lines.push("", formatTotals(report));
  if (assessments.length > 0) {
    lines.push(`files ${assessments.length}  findings ${report.findings.length}`);
  } else {
    lines.push(`findings ${report.findings.length}`);
  }

  return `${lines.join("\n")}\n`;
}

export function formatTotals(report: TokenRiskReport): string {
  const { beforeTokens, afterTokens, savedTokens } = report.totals;
  const width = Math.max(
    String(beforeTokens).length,
    String(afterTokens).length,
    String(savedTokens).length,
  );
  return [
    `beforeTokens  ${padLeft(String(beforeTokens), width)}`,
    `afterTokens   ${padLeft(String(afterTokens), width)}`,
    `savedTokens   ${padLeft(String(savedTokens), width)}`,
  ].join("\n");
}
