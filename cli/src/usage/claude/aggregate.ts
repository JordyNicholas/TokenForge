import type { UsageTeamRow } from "@tokenforge/risk-core";
import type { ClaudeWorkspaceSpend } from "./cost";

export function claudeWorkspaceRows(
  workspaces: ClaudeWorkspaceSpend[],
  totalCents: number,
): UsageTeamRow[] {
  if (workspaces.length === 0) {
    return [
      {
        team: "organization",
        creditsUsed: totalCents,
        estimatedUsd: totalCents / 100,
      },
    ];
  }
  return workspaces.map((row) => ({
    team: row.workspaceId === "default" ? "default-workspace" : row.workspaceId,
    creditsUsed: row.amountCents,
    estimatedUsd: row.amountCents / 100,
  }));
}
