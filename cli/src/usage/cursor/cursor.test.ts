import { describe, expect, it } from "vitest";
import { isUsageMetrics } from "@tokenforge/risk-core";
import { UsageError } from "../../app/errors";
import type { CursorClient } from "./client";
import { createCursorUsageProvider } from "./cursor";

const stubClient = {
  apiBase: "https://api.example.com",
  fetch: async () => new Response(),
} satisfies CursorClient;

describe("Cursor UsageProvider", () => {
  it("maps monthly spend by team into UsageMetrics sync", async () => {
    const provider = createCursorUsageProvider({
      organizationId: "org_abc123",
      client: stubClient,
      fetchUsageByTeam: async () => ({
        teams: [
          { teamId: 7, chargedCents: 1200 },
          { teamId: 8, chargedCents: 800 },
        ],
        totalCents: 2000,
      }),
    });

    const usage = await provider.fetchUsage({
      org: "org_abc123",
      period: "2026-08",
    });
    expect(isUsageMetrics(usage)).toBe(true);
    expect(usage.source).toBe("sync");
    expect(usage.totals).toEqual({ creditsUsed: 2000, estimatedUsd: 20 });
    expect(usage.teams.map((row) => row.team)).toEqual(["team-7", "team-8"]);
  });

  it("requires organizationId and period", async () => {
    const provider = createCursorUsageProvider({ client: stubClient });
    await expect(provider.fetchUsage({ period: "2026-08" })).rejects.toThrow(/organizationId/i);
    await expect(
      provider.fetchUsage({ org: "org_abc123", period: "" }),
    ).rejects.toThrow(UsageError);
  });
});
