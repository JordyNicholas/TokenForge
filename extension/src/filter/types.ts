/** Per-tab user decision for Context Guard recommendations. */
export type TabDecision = "pending" | "kept" | "filtered";

export function isFiltered(decision: TabDecision): boolean {
  return decision === "filtered";
}
