import { totalsFromUsageTeams, type UsageTeamRow } from "@tokenforge/risk-core";

export type CopilotUserDayRow = {
  user_id: number;
  day: string;
  organization_id?: string;
  ai_credits_used?: number;
};

export type CopilotUserTeamDayRow = {
  user_id: number;
  day: string;
  organization_id?: string;
  slug: string;
};

export type BillingTotals = {
  creditsUsed: number;
  estimatedUsd: number;
};

/** Sum org billing AI credit line items into UsageMetrics totals. */
export function sumBillingAiCreditItems(
  items: Array<{ netQuantity?: number; netAmount?: number }>,
): BillingTotals {
  return items.reduce(
    (acc, item) => ({
      creditsUsed: acc.creditsUsed + (item.netQuantity ?? 0),
      estimatedUsd: acc.estimatedUsd + (item.netAmount ?? 0),
    }),
    { creditsUsed: 0, estimatedUsd: 0 },
  );
}

/**
 * Inner-join Copilot users + user-teams NDJSON (GitHub team-level metrics guide).
 * USD is allocated proportionally from billed totals when metrics credits differ.
 */
export function aggregateTeamUsage(
  users: CopilotUserDayRow[],
  userTeams: CopilotUserTeamDayRow[],
  billing: BillingTotals,
): UsageTeamRow[] {
  const teamLookup = new Map<string, Map<number, string>>();
  for (const row of userTeams) {
    const key = `${row.day}::${row.organization_id ?? ""}`;
    let byUser = teamLookup.get(key);
    if (!byUser) {
      byUser = new Map();
      teamLookup.set(key, byUser);
    }
    byUser.set(row.user_id, row.slug);
  }

  const creditsByTeam = new Map<string, number>();
  for (const user of users) {
    const credits = user.ai_credits_used ?? 0;
    if (credits <= 0) {
      continue;
    }
    const key = `${user.day}::${user.organization_id ?? ""}`;
    const slug = teamLookup.get(key)?.get(user.user_id);
    if (!slug) {
      continue;
    }
    creditsByTeam.set(slug, (creditsByTeam.get(slug) ?? 0) + credits);
  }

  if (creditsByTeam.size === 0) {
    return [];
  }

  const metricCredits = [...creditsByTeam.values()].reduce((sum, value) => sum + value, 0);
  const usdPerCredit =
    metricCredits > 0 && billing.estimatedUsd > 0
      ? billing.estimatedUsd / metricCredits
      : 0;

  const teams: UsageTeamRow[] = [...creditsByTeam.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([team, creditsUsed]) => ({
      team,
      creditsUsed: roundCredits(creditsUsed),
      estimatedUsd: roundUsd(creditsUsed * usdPerCredit),
    }));

  const totals = totalsFromUsageTeams(teams);
  if (billing.creditsUsed > 0 && Math.abs(totals.creditsUsed - billing.creditsUsed) > 0.01) {
    // Keep billed credits authoritative; scale team rows to billing total.
    const scale = billing.creditsUsed / totals.creditsUsed;
    return teams.map((row) => ({
      team: row.team,
      creditsUsed: roundCredits(row.creditsUsed * scale),
      estimatedUsd: roundUsd(row.estimatedUsd * scale),
    }));
  }
  return teams;
}

function roundCredits(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}
