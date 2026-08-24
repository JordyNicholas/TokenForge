import type { UsageTeamRow } from "@tokenforge/risk-core";
import type { CursorTeamSpend } from "./billing";

export function cursorTeamRows(
  teams: CursorTeamSpend[],
  totalCents: number,
  organizationId: string,
): UsageTeamRow[] {
  if (teams.length === 0) {
    return [
      {
        team: organizationId,
        creditsUsed: totalCents,
        estimatedUsd: totalCents / 100,
      },
    ];
  }
  return teams.map((row) => ({
    team: `team-${row.teamId}`,
    creditsUsed: row.chargedCents,
    estimatedUsd: row.chargedCents / 100,
  }));
}
