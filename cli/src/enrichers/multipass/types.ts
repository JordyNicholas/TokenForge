/**
 * Compact repo context produced by Pass A (map).
 * Paths must refer to enrichment candidates; parsers drop unknowns.
 */
export type RepoContextMap = {
  /** Always-on instruction / rules centers. */
  hubs: string[];
  /** Likely duplicate or overlapping path groups. */
  clusters: string[][];
  /** Paths that should be judged in the same Pass B batch when possible. */
  batchHints: string[][];
  /** Optional ranking of paths worth deeper attention. */
  suspects?: string[];
};
