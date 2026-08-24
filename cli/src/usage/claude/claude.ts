import { type UsageMetrics, type UsageTeamRow } from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../../app/errors";
import type { FetchUsageQuery, UsageProvider } from "../types";
import { parseUsagePeriod } from "../period";
import { applyTeamScope } from "../scope";
import { claudeWorkspaceRows } from "./aggregate";
import { fetchOrgCostByWorkspace } from "./cost";
import {
  createClaudeClient,
  resolveClaudeAdminApiKey,
  type ClaudeClient,
} from "./client";

export type ClaudeUsageProviderOptions = {
  apiKey?: string;
  apiBase?: string;
  fetchImpl?: ClaudeClient["fetch"];
  client?: ClaudeClient;
  fetchCostByWorkspace?: typeof fetchOrgCostByWorkspace;
};

const PROVIDER_LABEL = "Claude Console (org cost sync)";

function orgRow(totalCents: number): UsageTeamRow {
  return {
    team: "organization",
    creditsUsed: totalCents,
    estimatedUsd: totalCents / 100,
  };
}

/**
 * Live Claude Console usage adapter (#92): Admin API cost report → monthly USD by workspace.
 * Codex CLI has no org billing API — use file import (#85) or this Console path when applicable.
 */
export function createClaudeUsageProvider(
  options: ClaudeUsageProviderOptions = {},
): UsageProvider {
  const fetchCostByWorkspace = options.fetchCostByWorkspace ?? fetchOrgCostByWorkspace;

  return {
    id: "claude",
    async fetchUsage(query: FetchUsageQuery): Promise<UsageMetrics> {
      if (!query.period?.trim()) {
        throw new UsageError("fetchUsage requires a non-empty period (YYYY-MM).");
      }

      const period = parseUsagePeriod(query.period);
      const client =
        options.client ??
        createClaudeClient({
          apiKey: resolveClaudeAdminApiKey(options.apiKey),
          apiBase: options.apiBase,
          fetchImpl: options.fetchImpl,
        });

      const billed = await fetchCostByWorkspace(client, period);
      if (billed.totalCents <= 0) {
        throw new RuntimeError(
          `No billed Claude usage returned for ${period.label}. ` +
            "AWS-hosted Console has no programmatic cost API — use file import (#85).",
        );
      }

      let teams = claudeWorkspaceRows(billed.workspaces, billed.totalCents);
      if (teams.length === 0) {
        teams = [orgRow(billed.totalCents)];
      }

      const metrics: UsageMetrics = {
        source: "sync",
        providerLabel: PROVIDER_LABEL,
        period: period.label,
        teams,
        totals: {
          creditsUsed: billed.totalCents,
          estimatedUsd: billed.totalCents / 100,
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
