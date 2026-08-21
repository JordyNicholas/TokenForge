export type { Assumptions } from "./assumptions";
export {
  DEFAULT_ASSUMPTIONS,
  PITCH_REALIZED_WASTE_SHARE,
  withPitchScenario,
} from "./assumptions";
export {
  listHybridScanSummaries,
  type HybridScanSummary,
} from "./hybridMeta";
export { displayPath, isDemoSourceLabel } from "./privacy";
export {
  SAVED_PERCENT_DIGITS,
  blendedUsdPerMillion,
  projectSavings,
  scenarioSavedPercent,
  tokenSavedPercent,
  type Projection,
} from "./calculator";
export { formatPercent, formatTokens, formatUsd, truncateText } from "./format";
export {
  ACTION_LABELS,
  SOURCE_LABELS,
  SUGGESTION_KIND_LABELS,
} from "./labels";
export {
  listFindings,
  tokensByFileClass,
  topOffenders,
  type ClassBucket,
  type FindingRow,
  type OffenderRow,
} from "./offenders";
export {
  SCAN_LAYER_LABELS,
  SCAN_LAYER_LEADS,
  SCAN_LAYER_HINTS,
  LLM_BOARD_LOCKED_HINT,
  aggregateLayerTotals,
  layerActionableFindingCount,
  parseScanLayerId,
  parseBoardLayerFromPath,
  reportsForLayer,
  reportHasHybridLlm,
  seedHasLlmLayer,
  getLlmAnalysisOverview,
  type ScanLayerId,
} from "./layers";
export {
  DEMO_SEED_URL,
  SeedLoadError,
  aggregateTotals,
  errorMessage,
  isDashboardSeed,
  parseDashboardDocument,
  resolveBootSourceUrl,
  type DashboardSeed,
} from "./seed";
