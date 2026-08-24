import type { UsagePeriod } from "../period";
import { usagePeriodEpochBounds } from "../period";
import type { CursorClient } from "./client";
import { readCursorJsonResponse } from "./client";

export type CursorUsageEvent = {
  teamId: number;
  chargedCents?: number;
  isChargeable?: boolean;
};

type FilteredUsageEventsResponse = {
  usageEvents?: CursorUsageEvent[];
  pagination?: {
    hasNextPage?: boolean;
    page?: number;
  };
};

export type CursorTeamSpend = {
  teamId: number;
  chargedCents: number;
};

/** Sum chargeable usage events by team for a calendar month. */
export async function fetchOrgUsageByTeam(
  client: CursorClient,
  organizationId: string,
  period: UsagePeriod,
): Promise<{ teams: CursorTeamSpend[]; totalCents: number }> {
  const { startMs, endMs } = usagePeriodEpochBounds(period);
  const byTeam = new Map<number, number>();
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    const response = await client.fetch(`${client.apiBase}/organizations/filtered-usage-events`, {
      method: "POST",
      body: JSON.stringify({
        organizationId,
        startDate: startMs,
        endDate: endMs,
        page,
        pageSize: 100,
      }),
    });
    const payload = await readCursorJsonResponse<FilteredUsageEventsResponse>(
      response,
      `Cursor usage events for ${organizationId} ${period.label}`,
    );
    for (const event of payload.usageEvents ?? []) {
      if (event.isChargeable === false) {
        continue;
      }
      const cents = event.chargedCents ?? 0;
      if (cents <= 0) {
        continue;
      }
      byTeam.set(event.teamId, (byTeam.get(event.teamId) ?? 0) + cents);
    }
    hasNext = payload.pagination?.hasNextPage === true;
    page += 1;
    if (page > 500) {
      break;
    }
  }

  const teams = [...byTeam.entries()]
    .map(([teamId, chargedCents]) => ({ teamId, chargedCents }))
    .sort((a, b) => b.chargedCents - a.chargedCents);
  const totalCents = teams.reduce((sum, row) => sum + row.chargedCents, 0);
  return { teams, totalCents };
}
