import type { UsageMetrics } from "@tokenforge/risk-core";

/**
 * Prove usage in-port (Wave B / #89).
 * Live vendor SDKs belong only in CLI adapters that implement this — not in risk-core
 * and not in the dashboard.
 */
export type FetchUsageQuery = {
  /** Optional org / tenant id for live adapters; fixture may enforce when configured. */
  org?: string;
  /** Billing period key, e.g. `2026-08`. */
  period: string;
  /** When set, return only that team's row (totals recomputed). */
  teamScope?: string | null;
};

export type UsageProviderId = "fixture" | "copilot" | string;

export type UsageProvider = {
  id: UsageProviderId;
  fetchUsage(query: FetchUsageQuery): Promise<UsageMetrics>;
};
