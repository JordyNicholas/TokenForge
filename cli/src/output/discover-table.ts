import type { DiscoverOpportunity } from "@tokenforge/risk-core";
import type { DiscoverResult } from "../commands/discover/discover";

function pad(value: string, width: number): string {
  return value.length >= width ? value : `${value}${" ".repeat(width - value.length)}`;
}

function padLeft(value: string, width: number): string {
  return value.length >= width ? value : `${" ".repeat(width - value.length)}${value}`;
}

function formatRows(opportunities: readonly DiscoverOpportunity[]): string[] {
  const headers = ["PATH", "CATEGORY", "REASON", "TOKENS"] as const;
  const rows = opportunities.map((row) => [
    row.path,
    row.category,
    row.reason,
    String(row.estTokens),
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
          index === 3
            ? padLeft(cell, widths[index] ?? 0)
            : pad(cell, widths[index] ?? 0),
        )
        .join("  "),
    ),
  ];

  if (rows.length === 0) {
    lines.push("(no missed opportunities)");
  }

  return lines;
}

export function formatDiscoverTable(result: DiscoverResult): string {
  const lines = [
    `discover ${result.report.team} · ${result.report.provider}`,
    `report ${result.reportPath}`,
    `exclusions ${result.exclusionPath}${result.appliedPatterns.length === 0 ? " (missing)" : ""}`,
    ...formatRows(result.opportunities),
    "",
    `missedTokens  ${result.missedTokens}`,
  ];

  if (result.opportunities.some((row) => row.category === "policy_gap")) {
    lines.push("hint          run `tokenforge apply` to write missing exclusion paths");
  }

  return `${lines.join("\n")}\n`;
}
