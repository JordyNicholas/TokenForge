import { useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import {
  aggregateLayerTotals,
  parseBoardLayerFromPath,
  parseScanLayerId,
  parseTeamIdFromPath,
  projectSavings,
  reportsForLayer,
  type ScanLayerId,
} from "../domain";
import { useDashboard } from "./DashboardProvider";

export function useBoardLayer(): ScanLayerId {
  const { layerId } = useParams();
  const location = useLocation();
  return parseScanLayerId(layerId) ?? parseBoardLayerFromPath(location.pathname);
}

/** Active team scope, or null for the global BU roll-up. */
export function useTeamScope(): string | null {
  const { teamId } = useParams();
  const location = useLocation();
  if (typeof teamId === "string" && teamId.length > 0) {
    try {
      return decodeURIComponent(teamId);
    } catch {
      return teamId;
    }
  }
  return parseTeamIdFromPath(location.pathname);
}

/** Layer-scoped (and optional team-scoped) reports, totals, and projection. */
export function useLayerView() {
  const boardLayer = useBoardLayer();
  const teamId = useTeamScope();
  const dashboard = useDashboard();
  const { seed, assumptions } = dashboard;

  const layer = useMemo(() => {
    const baseReports = seed?.reports ?? [];
    const layered = reportsForLayer(baseReports, boardLayer);
    const reports = teamId
      ? layered.filter((report) => report.team === teamId)
      : layered;
    const totals = seed
      ? teamId
        ? aggregateLayerTotals(
            baseReports.filter((report) => report.team === teamId),
            boardLayer,
          )
        : aggregateLayerTotals(baseReports, boardLayer)
      : {
          beforeTokens: 0,
          afterTokens: 0,
          savedTokens: 0,
        };
    const projection = projectSavings(totals, assumptions);
    return { reports, totals, projection, teamId };
  }, [boardLayer, teamId, seed, assumptions]);

  return {
    ...dashboard,
    boardLayer,
    teamId: layer.teamId,
    scopeLabel: layer.teamId ? `Team · ${layer.teamId}` : "Global · all teams",
    reports: layer.reports,
    totals: layer.totals,
    projection: layer.projection,
  };
}
