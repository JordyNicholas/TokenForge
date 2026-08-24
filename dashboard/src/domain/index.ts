export type { Assumptions } from "./assumptions";
export {
  DEFAULT_ASSUMPTIONS,
  PITCH_REALIZED_WASTE_SHARE,
  assumptionsEqual,
  cloneAssumptions,
  summarizeAssumptionsFreeze,
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
  boardScopeBase,
  boardSubpath,
  boardViewSuffix,
  parseTeamIdFromPath,
} from "./teamScope";
export {
  ARCHITECTURE_LABELS,
  architectureForTeam,
  tokensByArchitecture,
  isArchitectureStyle,
  type ArchitectureBucket,
  type ArchitectureStyle,
} from "./architecture";
export {
  isUsageMetrics,
  totalsFromUsageTeams,
  usageForTeam,
  type UsageMetrics,
  type UsageSource,
  type UsageTeamRow,
} from "./usage";
export {
  compareUsagePeriods,
  usagePeriodSlice,
  type UsagePeriodCompare,
  type UsagePeriodSlice,
} from "./usageCompare";
export {
  buildVarianceBoard,
  defaultAfterPeriod,
  listUsagePeriods,
  upsertUsageSnapshot,
  formatGapPercent,
  varianceGapPercent,
  type VarianceBoard,
  type VarianceBoardRow,
} from "./varianceBoard";
export {
  UsageLoadError,
  normalizeUsageMetrics,
  parseUsageCsv,
  parseUsageFile,
  parseUsageJson,
  parseUsageText,
} from "./parseUsage";
export {
  compactionAdvice,
  routingAdvice,
  type CompactionAdvice,
  type RoutingAdvice,
} from "./advisory";
export {
  DEMO_SEED_URL,
  DEMO_USAGE_URL,
  SeedLoadError,
  aggregateTotals,
  errorMessage,
  isDashboardSeed,
  parseDashboardDocument,
  resolveBootAfterUsageUrl,
  resolveBootSourceUrl,
  type DashboardSeed,
} from "./seed";
