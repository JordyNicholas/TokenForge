/**
 * Prove billed-usage contract — shared kernel types (Wave B / #89).
 * Dashboard FinOps import UX and CLI UsageProvider adapters agree on this shape.
 * Re-exports from `@tokenforge/risk-core` so surfaces do not fork the schema.
 */
export {
  isUsageMetrics,
  totalsFromUsageTeams,
  usageForTeam,
  type UsageMetrics,
  type UsageSource,
  type UsageTeamRow,
} from "@tokenforge/risk-core";
