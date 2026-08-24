import { describe, expect, it } from "vitest";
import { aggregateTeamUsage, sumBillingAiCreditItems } from "./aggregate";

describe("sumBillingAiCreditItems", () => {
  it("sums net quantity and amount", () => {
    expect(
      sumBillingAiCreditItems([
        { netQuantity: 10, netAmount: 1.5 },
        { netQuantity: 5, netAmount: 0.5 },
      ]),
    ).toEqual({ creditsUsed: 15, estimatedUsd: 2 });
  });
});

describe("aggregateTeamUsage", () => {
  it("joins users and user-teams by day and allocates USD", () => {
    const teams = aggregateTeamUsage(
      [
        { user_id: 1, day: "2026-08-01", organization_id: "99", ai_credits_used: 100 },
        { user_id: 2, day: "2026-08-01", organization_id: "99", ai_credits_used: 50 },
      ],
      [
        { user_id: 1, day: "2026-08-01", organization_id: "99", slug: "checkout" },
        { user_id: 2, day: "2026-08-01", organization_id: "99", slug: "platform-services" },
      ],
      { creditsUsed: 150, estimatedUsd: 300 },
    );
    expect(teams).toEqual([
      { team: "checkout", creditsUsed: 100, estimatedUsd: 200 },
      { team: "platform-services", creditsUsed: 50, estimatedUsd: 100 },
    ]);
  });

  it("returns empty when join finds no teams", () => {
    expect(
      aggregateTeamUsage(
        [{ user_id: 1, day: "2026-08-01", ai_credits_used: 10 }],
        [],
        { creditsUsed: 10, estimatedUsd: 20 },
      ),
    ).toEqual([]);
  });
});
