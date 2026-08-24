import type { UsagePeriod } from "../period";
import type { GitHubClient } from "../github/client";
import { readJsonResponse } from "../github/client";
import { sumBillingAiCreditItems, type BillingTotals } from "./aggregate";

type BillingAiCreditResponse = {
  timePeriod?: { year?: number; month?: number };
  usageItems?: Array<{ netQuantity?: number; netAmount?: number }>;
};

/** Org billed AI credits for a calendar month (enhanced billing platform). */
export async function fetchOrgBillingTotals(
  client: GitHubClient,
  org: string,
  period: UsagePeriod,
): Promise<BillingTotals> {
  const url = new URL(
    `${client.apiBase}/organizations/${encodeURIComponent(org)}/settings/billing/ai_credit/usage`,
  );
  url.searchParams.set("year", String(period.year));
  url.searchParams.set("month", String(period.month));

  const response = await client.fetch(url.toString());
  const payload = await readJsonResponse<BillingAiCreditResponse>(
    response,
    `Copilot billing for ${org} ${period.label}`,
  );
  return sumBillingAiCreditItems(payload.usageItems ?? []);
}
