import {
  type UsageMetrics,
  type UsageTeamRow,
} from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../../app/errors";
import type { FetchUsageQuery, UsageProvider } from "../types";
import { daysInUsagePeriod, parseUsagePeriod } from "../period";
import { applyTeamScope } from "../scope";
import {
  createGitHubClient,
  resolveGitHubToken,
  type GitHubClient,
  type GitHubFetch,
} from "../github/client";
import { aggregateTeamUsage } from "./aggregate";
import { fetchOrgBillingTotals } from "./billing";
import { fetchOrgCopilotMetricsForDays } from "./metrics";

export type CopilotUsageProviderOptions = {
  /** GitHub organization slug (required unless every query passes org). */
  org?: string;
  /** PAT with org billing + Copilot metrics (defaults to GITHUB_TOKEN). */
  token?: string;
  apiBase?: string;
  fetchImpl?: GitHubFetch;
  /**
   * When true (default), join daily Copilot metrics for team rows.
   * When false, emit a single org-level team row from billing only.
   */
  teamBreakdown?: boolean;
  /** Inject billing/metrics for tests. */
  client?: GitHubClient;
  fetchBilling?: typeof fetchOrgBillingTotals;
  fetchMetrics?: typeof fetchOrgCopilotMetricsForDays;
};

const PROVIDER_LABEL = "GitHub Copilot (org billing sync)";

function orgRow(org: string, totals: UsageMetrics["totals"]): UsageTeamRow {
  return {
    team: org,
    creditsUsed: totals.creditsUsed,
    estimatedUsd: totals.estimatedUsd,
  };
}

/**
 * Live Copilot usage adapter (#90): org PAT → billing totals + optional team breakdown
 * from Copilot metrics NDJSON. Not agent pipeline metering.
 */
export function createCopilotUsageProvider(
  options: CopilotUsageProviderOptions = {},
): UsageProvider {
  const teamBreakdown = options.teamBreakdown !== false;
  const fetchBilling = options.fetchBilling ?? fetchOrgBillingTotals;
  const fetchMetrics = options.fetchMetrics ?? fetchOrgCopilotMetricsForDays;

  return {
    id: "copilot",
    async fetchUsage(query: FetchUsageQuery): Promise<UsageMetrics> {
      if (!query.period?.trim()) {
        throw new UsageError("fetchUsage requires a non-empty period (YYYY-MM).");
      }
      const org = query.org?.trim() || options.org?.trim();
      if (!org) {
        throw new UsageError(
          'Copilot usage provider requires org (query.org or provider option "org").',
        );
      }
      if (options.org && query.org && query.org.trim() !== options.org.trim()) {
        throw new UsageError(
          `Copilot org mismatch: configured "${options.org}", query "${query.org}".`,
        );
      }

      const period = parseUsagePeriod(query.period);
      const client =
        options.client ??
        createGitHubClient({
          token: resolveGitHubToken(options.token),
          apiBase: options.apiBase,
          fetchImpl: options.fetchImpl,
        });

      const billing = await fetchBilling(client, org, period);
      if (billing.creditsUsed <= 0 && billing.estimatedUsd <= 0) {
        throw new RuntimeError(
          `No billed AI credit usage returned for ${org} ${period.label}.`,
        );
      }

      let teams: UsageTeamRow[] = [];
      if (teamBreakdown) {
        try {
          const metrics = await fetchMetrics(client, org, daysInUsagePeriod(period));
          teams = aggregateTeamUsage(metrics.users, metrics.userTeams, billing);
        } catch (error) {
          const detail = error instanceof Error ? error.message : String(error);
          if (process.env.TOKENFORGE_DEBUG_USAGE === "1") {
            console.error(`tokenforge: Copilot team metrics unavailable — ${detail}`);
          }
        }
      }

      if (teams.length === 0) {
        teams = [orgRow(org, billing)];
      }

      const metrics: UsageMetrics = {
        source: "sync",
        providerLabel: PROVIDER_LABEL,
        period: period.label,
        teams,
        totals: {
          creditsUsed: billing.creditsUsed,
          estimatedUsd: billing.estimatedUsd,
        },
      };

      const scope = query.teamScope?.trim();
      if (scope) {
        return applyTeamScope(metrics, scope);
      }
      return metrics;
    },
  };
}
