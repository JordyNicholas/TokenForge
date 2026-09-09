export {
  API_CONTRACT_PATTERNS,
  AUXILIARY_DATA_DIR_NAMES,
  AUXILIARY_OVERSIZED_BYTES,
  BYTES_PER_TOKEN,
  CLASS_WEIGHT,
  DEFAULT_BORDERLINE_CANDIDATE_COUNT,
  DEFAULT_MAX_ENRICHMENT_CANDIDATES,
  DEFAULT_REPEATED_CONFIG_COUNT,
  DEFAULT_SOURCE_CANDIDATE_COUNT,
  DEFAULT_TOP_CANDIDATE_COUNT,
  HIGH_RISK_FILE_CLASSES,
  NECESSARY_GENERATED_SEGMENTS,
  PROTECTED_CONFIG_NAMES,
  PROTECTED_CONFIG_PATTERNS,
  SECRET_FILE_PATTERNS,
  INACTIVE_MS,
  BACKGROUND_INACTIVE_MS,
  INSTRUCTION_FILE_NAMES,
  INSTRUCTION_PATH_SEGMENTS,
  MIN_BORDERLINE_BYTES,
  OVERSIZED_BYTES,
  SOURCE_OVERSIZED_BYTES,
  SCORE_WEIGHT_CLASS,
  SCORE_WEIGHT_INACTIVE,
  SCORE_WEIGHT_SIZE,
  SUGGESTION_KINDS,
  MAX_ANALYSIS_OVERVIEW_SUMMARY_CHARS,
  MAX_ANALYSIS_OVERVIEW_THEME_CHARS,
  MAX_ANALYSIS_OVERVIEW_THEMES,
  MAX_ANALYSIS_OVERVIEW_CAVEAT_CHARS,
  MAX_ANALYSIS_OVERVIEW_CAVEATS,
  TOKENFORGE_SECTION_BEGIN,
  TOKENFORGE_SECTION_END,
  TOKEN_RISK_REPORT_SCHEMA_ID,
  TOKEN_RISK_REPORT_SCHEMA_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V0_ID,
  TOKEN_RISK_REPORT_SCHEMA_V0_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V1_ID,
  TOKEN_RISK_REPORT_SCHEMA_V1_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V2_ID,
  TOKEN_RISK_REPORT_SCHEMA_V2_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V3_ID,
  TOKEN_RISK_REPORT_SCHEMA_V3_PATH,
  TOKEN_RISK_REPORT_SCHEMA_V4_ID,
  TOKEN_RISK_REPORT_SCHEMA_V4_PATH,
  MAX_LEAN_INSTRUCTION_BYTES,
  MAX_PERSONA_LINE_CHARS,
  MAX_REASONING_PERSONA_LINES,
  MAX_REASONING_SECTION_BYTES,
  MAX_ROLE_RULE_CHARS,
  MAX_ROLE_SAMPLE_FILES,
  MIN_REASONING_DISTINCT_ROLES,
  MIN_REASONING_ROLE_DIRS,
  DEFAULT_HEURISTIC_POLICY_MAX_BYTES,
  DEFAULT_HYBRID_POLICY_MAX_BYTES,
} from "./domain/constants";
export {
  selectEnrichmentCandidates,
  orderedBucketAssessments,
  isInstructionPath,
  repeatedConfigBasenames,
} from "./candidates/candidates";
export {
  buildHeuristicAttentionSet,
  orderedAttentionAssessments,
  attentionPriorityScore,
  enrichmentTierForBackend,
  type EnrichmentTier,
  type HeuristicAttentionInput,
  type HeuristicAttentionOptions,
} from "./candidates/attention";
export {
  DEFAULT_REASONING_PACK_MODE,
  REASONING_PACK_MODES,
  isReasoningPackMode,
  isTokenForgeConfig,
  parseApplyMode,
  parseReasoningPackMode,
  resolvePolicyMaxBytes,
  resolveReasoningPackMode,
  type ApplyMode,
  type EnrichmentTierSetting,
  type ReasoningPackMode,
  type TokenForgeConfig,
} from "./config/tokenforge-config";
export { classifyFiletype, isPrismaGeneratedPath } from "./classify/classify";
export {
  isApiContractPath,
  isAuxiliaryDataPath,
  isNecessaryGeneratedPath,
  isProtectedConfigPath,
  isSecretPath,
  protectionFor,
  type PathProtection,
} from "./protect/protect";
export { estimateTokens } from "./estimate/estimate";
export {
  buildScanLayers,
  computeHybridDelta,
  tallyCombinedTotals,
  tallyHeuristicTotals,
  tallyLlmTotals,
} from "./layers/totals";
export type { BuildScanLayersResult } from "./layers/totals";
export {
  hasLlmLayerData,
  reportForLayer,
  resolveScanLayer,
  resolveScanLayers,
} from "./layers/resolve";
export { explainFinding } from "./advise/explain";
export {
  WASTE_KIND_LABEL,
  dominantWasteKinds,
  wasteKindFor,
  type WasteKind,
} from "./advise/kinds";
export {
  isLlmAnalysisOverview,
  parseLlmAnalysisOverview,
} from "./advise/overview";
export {
  parseContextIndexRecommendations,
  isContextIndexPath,
} from "./advise/contextIndex";
export {
  isFindingSuggestion,
  isSuggestionKind,
  resolveSuggestion,
  templateSuggestion,
} from "./advise/suggest";
export {
  REASONING_SECTION_HEADING,
  buildReasoningSection,
  buildScopedReasoningRules,
  hasExistingPersona,
  isRenderablePersonaLine,
  meetsReasoningEmissionGate,
  personaLines,
  type ReasoningSectionInput,
  type ScopedReasoningRule,
} from "./advise/reasoning";
export {
  synthesizeLeanInstructions,
  type SynthesizeLeanInstructionsOptions,
} from "./advise/instructions";
export {
  STACK_MANIFEST_NAMES,
  detectStack,
  type DetectStackInput,
} from "./stack/detectStack";
export {
  REASONING_BREADTH,
  ROLE_RULES,
  hasStrategyVocabulary,
  isRenderableRoleRule,
  resolveDirectoryRoles,
  type DirectoryEntry,
  type ResolveDirectoryRolesInput,
} from "./stack/roles";
export { collapseExclusionPaths, type CollapseOptions } from "./policy/collapse";
export {
  ASSET_DIR_GLOB_SUFFIX,
  foldAssetDirectories,
  isAssetDirectoryGlob,
  type AssetDirectoryFold,
  type DensityInput,
  type DensityOptions,
} from "./policy/density";
export {
  discoverMissedOpportunities,
  isPathCoveredByExclusion,
  missedOpportunityTokens,
  proposedExclusionPaths,
  proposedIgnorePaths,
  type DiscoverOpportunity,
  type DiscoverOpportunityCategory,
} from "./policy/exclusions";
export { activePathSet, isActivePath } from "./policy/active";
export { coerceLlmVerdict, isLlmExcludeSafe } from "./policy/safety";
export type { LlmVerdict as PolicyLlmVerdict } from "./policy/safety";
export { mergeFindings } from "./merge/merge";
export { isTokenRiskReport } from "./report/report";
export { isSessionStatsReport } from "./report/sessionStats";
export { sessionAdoptionFromCounts } from "./adoption/sessionAdoption";
export { heuristicFindingAction, primaryReason, scoreRisk } from "./score/score";
export {
  buildInstructionHeuristicFindings,
  computeInstructionBudget,
  isInstructionStackOverBudget,
} from "./instruction/budget";
export {
  hasInstructionRepetition,
  maxParagraphRepeatCount,
  RECOMMENDED_INSTRUCTION_STACK_TOKENS,
} from "./instruction/repetition";
export {
  isUsageMetrics,
  totalsFromUsageTeams,
  usageForTeam,
} from "./usage/usage";
export {
  buildPackId,
  isProveChangeMarker,
} from "./usage/changeMarker";
export type { FindingExplanation } from "./advise/explain";
export type {
  FiletypeRiskClass,
  FindingAction,
  FindingReason,
  FindingSource,
  FindingSuggestion,
  LlmAnalysisOverview,
  ContextIndexRecommendation,
  RepoAuditCoverage,
  LlmBackendId,
  ProtectionKind,
  ProviderId,
  RiskAssessment,
  RiskInput,
  ScanLlmMetadata,
  ScanLayer,
  ScanLayerId,
  ScanLayers,
  ScanMetadata,
  ScanMode,
  ScanSource,
  SuggestionKind,
  TokenRiskFinding,
  TokenRiskReport,
  TokenRiskTotals,
  InstructionBudget,
  HybridDelta,
  ComplementarityStatus,
  SessionStatsHistoryEntry,
  SessionStatsReport,
  DirectoryRole,
  DirectoryRoleAssignment,
  ReasoningStrategy,
  RoleSignal,
  StackConfidence,
  StackLanguage,
  StackProfile,
} from "./domain/types";
export type { SessionAdoptionSnapshot } from "./adoption/sessionAdoption";
export type {
  UsageMetrics,
  UsageSource,
  UsageTeamRow,
} from "./usage/usage";
export type {
  ProveChangeAction,
  ProveChangeMarker,
} from "./usage/changeMarker";
