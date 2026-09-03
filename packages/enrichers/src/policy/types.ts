import type { TokenForgeConfig, TokenRiskReport } from "@tokenforge/risk-core";

export type PolicySynthesisInput = {
  report: TokenRiskReport;
  title: string;
  maxBytes?: number;
  config?: TokenForgeConfig;
  instructionContents: ReadonlyMap<string, string>;
  /** Directories an exclusion glob must not widen to; see `collapseExclusionPaths`. */
  keepDirs?: ReadonlySet<string>;
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
