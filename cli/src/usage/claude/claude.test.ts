import { describe, expect, it } from "vitest";
import { isUsageMetrics } from "@tokenforge/risk-core";
import { UsageError } from "../../app/errors";
import type { ClaudeClient } from "./client";
import { createClaudeUsageProvider } from "./claude";

const stubClient = {
  apiBase: "https://api.example.com",
  fetch: async () => new Response(),
} satisfies ClaudeClient;

describe("Claude UsageProvider", () => {
  it("maps monthly cost report by workspace into UsageMetrics sync", async () => {
    const provider = createClaudeUsageProvider({
      client: stubClient,
      fetchCostByWorkspace: async () => ({
        workspaces: [
          { workspaceId: "ws_checkout", amountCents: 1500 },
          { workspaceId: "ws_platform", amountCents: 500 },
        ],
        totalCents: 2000,
      }),
    });

    const usage = await provider.fetchUsage({ period: "2026-08" });
    expect(isUsageMetrics(usage)).toBe(true);
    expect(usage.source).toBe("sync");
    expect(usage.providerLabel).toContain("Claude");
    expect(usage.totals).toEqual({ creditsUsed: 2000, estimatedUsd: 20 });
    expect(usage.teams.map((row) => row.team)).toEqual(["ws_checkout", "ws_platform"]);
  });

  it("requires period", async () => {
    const provider = createClaudeUsageProvider({ client: stubClient });
    await expect(provider.fetchUsage({ period: "" })).rejects.toThrow(UsageError);
  });
});
