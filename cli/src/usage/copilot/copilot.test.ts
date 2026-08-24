import { describe, expect, it } from "vitest";
import { isUsageMetrics } from "@tokenforge/risk-core";
import { UsageError } from "../../app/errors";
import type { GitHubClient } from "../github/client";
import type { UsagePeriod } from "../period";
import { createCopilotUsageProvider } from "./copilot";

const period: UsagePeriod = {
  label: "2026-08",
  year: 2026,
  month: 8,
  daysInMonth: 31,
};

const stubClient = { apiBase: "https://api.example.com", fetch: async () => new Response() } satisfies GitHubClient;

describe("Copilot UsageProvider", () => {
  it("maps billing + team metrics into UsageMetrics sync", async () => {
    const provider = createCopilotUsageProvider({
      org: "acme-corp",
      client: stubClient,
      fetchBilling: async () => ({ creditsUsed: 150, estimatedUsd: 300 }),
      fetchMetrics: async () => ({
        users: [
          { user_id: 1, day: "2026-08-01", organization_id: "1", ai_credits_used: 100 },
          { user_id: 2, day: "2026-08-01", organization_id: "1", ai_credits_used: 50 },
        ],
        userTeams: [
          { user_id: 1, day: "2026-08-01", organization_id: "1", slug: "checkout" },
          { user_id: 2, day: "2026-08-01", organization_id: "1", slug: "data-eng" },
        ],
      }),
    });

    const usage = await provider.fetchUsage({ org: "acme-corp", period: "2026-08" });
    expect(isUsageMetrics(usage)).toBe(true);
    expect(usage.source).toBe("sync");
    expect(usage.providerLabel).toContain("Copilot");
    expect(usage.totals).toEqual({ creditsUsed: 150, estimatedUsd: 300 });
    expect(usage.teams.map((row) => row.team).sort()).toEqual(["checkout", "data-eng"]);
  });

  it("falls back to org row when metrics fail", async () => {
    const provider = createCopilotUsageProvider({
      org: "acme-corp",
      client: stubClient,
      fetchBilling: async () => ({ creditsUsed: 40, estimatedUsd: 80 }),
      fetchMetrics: async () => {
        throw new Error("metrics disabled");
      },
    });
    const usage = await provider.fetchUsage({ period: "2026-08" });
    expect(usage.teams).toEqual([
      { team: "acme-corp", creditsUsed: 40, estimatedUsd: 80 },
    ]);
  });

  it("filters teamScope", async () => {
    const provider = createCopilotUsageProvider({
      org: "acme-corp",
      client: stubClient,
      fetchBilling: async () => ({ creditsUsed: 100, estimatedUsd: 200 }),
      fetchMetrics: async () => ({
        users: [{ user_id: 1, day: "2026-08-01", organization_id: "1", ai_credits_used: 100 }],
        userTeams: [{ user_id: 1, day: "2026-08-01", organization_id: "1", slug: "checkout" }],
      }),
    });
    const usage = await provider.fetchUsage({
      period: "2026-08",
      teamScope: "checkout",
    });
    expect(usage.teams).toHaveLength(1);
    expect(usage.teams[0]?.team).toBe("checkout");
    expect(usage.totals.creditsUsed).toBe(100);
  });

  it("requires org and period", async () => {
    const provider = createCopilotUsageProvider({ client: stubClient });
    await expect(provider.fetchUsage({ period: "2026-08" })).rejects.toThrow(/org/i);
    await expect(
      provider.fetchUsage({ org: "acme", period: "" }),
    ).rejects.toThrow(UsageError);
  });

  it("can skip team breakdown", async () => {
    const provider = createCopilotUsageProvider({
      org: "acme-corp",
      teamBreakdown: false,
      client: stubClient,
      fetchBilling: async (_client, org, p) => {
        expect(org).toBe("acme-corp");
        expect(p).toEqual(period);
        return { creditsUsed: 12, estimatedUsd: 24 };
      },
      fetchMetrics: async () => {
        throw new Error("should not fetch metrics");
      },
    });
    const usage = await provider.fetchUsage({ period: "2026-08" });
    expect(usage.teams[0]?.team).toBe("acme-corp");
  });
});
