/** Token Risk JSON contract (v0) plus kernel scoring types. */

export type ScanSource = "extension" | "cli";

/** Fix adapter that produced (or will produce) policy files. Scoring ignores this. */
export type ProviderId = "copilot" | "cursor" | "claude" | "generic";

export type FindingReason = "inactive_tab" | "high_risk_filetype" | "oversized";

export type FindingAction = "filtered" | "excluded" | "kept";

export type FiletypeRiskClass =
  | "lockfile"
  | "generated"
  | "config"
  | "source"
  | "unknown";

export type RiskInput = {
  path: string;
  bytes: number;
  inactiveMs: number;
};

export type RiskAssessment = {
  path: string;
  bytes: number;
  estTokens: number;
  fileClass: FiletypeRiskClass;
  /** Integer 0–100. Mix of filetype class, size, and inactivity. */
  score: number;
  atRisk: boolean;
  reasons: FindingReason[];
};

export type TokenRiskFinding = {
  path: string;
  reason: FindingReason;
  bytes: number;
  estTokens: number;
  action: FindingAction;
};

export type TokenRiskTotals = {
  beforeTokens: number;
  afterTokens: number;
  savedTokens: number;
};

/** Shared Detect/Fix → Prove document (`.tokenforge/scan-report.json`). */
export type TokenRiskReport = {
  source: ScanSource;
  timestamp: string;
  repo: string;
  team: string;
  provider: ProviderId;
  findings: TokenRiskFinding[];
  totals: TokenRiskTotals;
};
