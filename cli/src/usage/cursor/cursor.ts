import { type UsageMetrics, type UsageTeamRow } from "@tokenforge/risk-core";
import { RuntimeError, UsageError } from "../../app/errors";
import type { FetchUsageQuery, UsageProvider } from "../types";
import { parseUsagePeriod } from "../period";
import { applyTeamScope } from "../scope";
import { cursorTeamRows } from "./aggregate";
import { fetchOrgUsageByTeam } from "./billing";
import {
  createCursorClient,
  resolveCursorApiKey,
  type CursorClient,
} from "./client";

export type CursorUsageProviderOptions = {
  /** Cursor public organization id, e.g. `org_abc123`. */
  organizationId?: string;
  apiKey?: string;
  apiBase?: string;
  fetchImpl?: CursorClient["fetch"];
  client?: CursorClient;
  fetchUsageByTeam?: typeof fetchOrgUsageByTeam;
};

const PROVIDER_LABEL = "Cursor (org billing sync)";

function orgRow(organizationId: string, totalCents: number): UsageTeamRow {
  return {
    team: organizationId,
    creditsUsed: totalCents,
    estimatedUsd: totalCents / 100,
  };
}

/**
 * Live Cursor usage adapter (#91): org API key → monthly spend by team.
 * Not agent pipeline metering.
 */
export function createCursorUsageProvider(
  options: CursorUsageProviderOptions = {},
): UsageProvider {
  const fetchUsageByTeam = options.fetchUsageByTeam ?? fetchOrgUsageByTeam;

  return {
    id: "cursor",
    async fetchUsage(query: FetchUsageQuery): Promise<UsageMetrics> {
      if (!query.period?.trim()) {
        throw new UsageError("fetchUsage requires a non-empty period (YYYY-MM).");
      }
      const organizationId = query.org?.trim() || options.organizationId?.trim();
      if (!organizationId) {
        throw new UsageError(
          'Cursor usage provider requires org (Cursor organizationId, e.g. org_abc123).',
        );
      }
      if (
        options.organizationId &&
        query.org &&
        query.org.trim() !== options.organizationId.trim()
      ) {
        throw new UsageError(
          `Cursor org mismatch: configured "${options.organizationId}", query "${query.org}".`,
        );
      }

      const period = parseUsagePeriod(query.period);
      const client =
        options.client ??
        createCursorClient({
          apiKey: resolveCursorApiKey(options.apiKey),
          apiBase: options.apiBase,
          fetchImpl: options.fetchImpl,
        });

      const billed = await fetchUsageByTeam(client, organizationId, period);
      if (billed.totalCents <= 0) {
        throw new RuntimeError(
          `No billed Cursor usage returned for ${organizationId} ${period.label}.`,
        );
      }

      let teams = cursorTeamRows(billed.teams, billed.totalCents, organizationId);
      if (teams.length === 0) {
        teams = [orgRow(organizationId, billed.totalCents)];
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
