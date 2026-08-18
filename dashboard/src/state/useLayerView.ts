import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { aggregateLayerTotals, parseScanLayerId, projectSavings, reportsForLayer, type ScanLayerId } from "../domain";
import { useDashboard } from "./DashboardProvider";

export function useBoardLayer(): ScanLayerId {
  const { layerId } = useParams();
  return parseScanLayerId(layerId) ?? "combined";
}

/** Layer-scoped reports, totals, and projection for the active board. */
export function useLayerView() {
  const boardLayer = useBoardLayer();
  const {
    seed,
    assumptions,
    sourceLabel,
    loadError,
    patchAssumptions,
    loadFromFile,
    loadFromUrl,
    resetToDemo,
  } = useDashboard();

  return useMemo(() => {
    const baseReports = seed?.reports ?? [];
    const reports = reportsForLayer(baseReports, boardLayer);
    const totals = seed ? aggregateLayerTotals(baseReports, boardLayer) : {
      beforeTokens: 0,
      afterTokens: 0,
      savedTokens: 0,
    };
    const projection = projectSavings(totals, assumptions);

    return {
      seed,
      boardLayer,
      reports,
      totals,
      projection,
      assumptions,
      sourceLabel,
      loadError,
      patchAssumptions,
      loadFromFile,
      loadFromUrl,
      resetToDemo,
    };
  }, [
    boardLayer,
    seed,
    assumptions,
    sourceLabel,
    loadError,
    patchAssumptions,
    loadFromFile,
    loadFromUrl,
    resetToDemo,
  ]);
}
