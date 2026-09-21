import type {
  DirectoryRoleAssignment,
  ReasoningPackMode,
  StackProfile,
  TokenForgeConfig,
  TokenRiskReport,
} from "@tokenforge/risk-core";

export type PolicySynthesisInput = {
  report: TokenRiskReport;
  title: string;
  maxBytes?: number;
  config?: TokenForgeConfig;
  instructionContents: ReadonlyMap<string, string>;
  /** Directories an exclusion glob must not widen to; see `collapseExclusionPaths`. */
  keepDirs?: ReadonlySet<string>;
  /** Top-level source directories for the Prefer section. */
  sourceRoots?: readonly string[];
  /** What the repo is built with, for the reasoning-pack persona (F26). */
  stackProfile?: StackProfile;
  /** Directories the reasoning pack has a rule for (F26). */
  directoryRoles?: readonly DirectoryRoleAssignment[];
  /** How much of the reasoning pack to write. Absent means `off`. */
  reasoningPack?: ReasoningPackMode;
  /** Table is delivered as scoped rule files, so render the persona only. */
  scopedTable?: boolean;
  /**
   * Bodies of the role sample files, keyed by repo-relative path.
   *
   * Absent when repo content may not be sent to this backend. The role table
   * still goes either way, so refinement degrades to judging from names.
   */
  sampleFileContents?: ReadonlyMap<string, string>;
  model: string;
  backend?: string;
  timeoutMs?: number;
  externalDataConsent?: boolean;
  onProgress?: (message: string) => void;
};

export type PolicySynthesisResult = {
  markdown: string;
  backend: string;
  model: string;
  bytes: number;
  policyMaxBytes: number;
};
