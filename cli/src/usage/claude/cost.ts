import type { UsagePeriod } from "../period";
import { usagePeriodRfc3339Bounds } from "../period";
import type { ClaudeClient } from "./client";
import { readClaudeJsonResponse } from "./client";

type CostReportResult = {
  amount?: string;
  workspace_id?: string | null;
};

type CostReportBucket = {
  starting_at?: string;
  ending_at?: string;
  results?: CostReportResult[];
};

type CostReportResponse = {
  data?: CostReportBucket[];
  has_more?: boolean;
  next_page?: string | null;
};

export type ClaudeWorkspaceSpend = {
  workspaceId: string;
  amountCents: number;
};

function parseAmountCents(amount: string | undefined): number {
  if (!amount) {
    return 0;
  }
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Org cost report for a calendar month, grouped by workspace when available. */
export async function fetchOrgCostByWorkspace(
  client: ClaudeClient,
  period: UsagePeriod,
): Promise<{ workspaces: ClaudeWorkspaceSpend[]; totalCents: number }> {
  const { startingAt, endingAt } = usagePeriodRfc3339Bounds(period);
  const byWorkspace = new Map<string, number>();
  let page: string | undefined;
  let hasMore = true;
  let guard = 0;

  while (hasMore && guard < 100) {
    guard += 1;
    const url = new URL(`${client.apiBase}/v1/organizations/cost_report`);
    url.searchParams.set("starting_at", startingAt);
    url.searchParams.set("ending_at", endingAt);
    url.searchParams.append("group_by[]", "workspace_id");
    if (page) {
      url.searchParams.set("page", page);
    }

    const response = await client.fetch(url.toString());
    const payload = await readClaudeJsonResponse<CostReportResponse>(
      response,
      `Claude cost report for ${period.label}`,
    );

    for (const bucket of payload.data ?? []) {
      for (const result of bucket.results ?? []) {
        const cents = parseAmountCents(result.amount);
        if (cents <= 0) {
          continue;
        }
        const workspaceId = result.workspace_id?.trim() || "default";
        byWorkspace.set(workspaceId, (byWorkspace.get(workspaceId) ?? 0) + cents);
      }
    }

    hasMore = payload.has_more === true && Boolean(payload.next_page);
    page = payload.next_page ?? undefined;
  }

  const workspaces = [...byWorkspace.entries()]
    .map(([workspaceId, amountCents]) => ({ workspaceId, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
  const totalCents = workspaces.reduce((sum, row) => sum + row.amountCents, 0);
  return { workspaces, totalCents };
}
