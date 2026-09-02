import type { ShieldSession } from "../session/shieldSession";

export type DriftAdvice = {
  summary: string;
  suggestions: readonly string[];
};

/** Heuristic stub — flags large pending context vs session baseline. */
export function adviseContextDrift(session: ShieldSession): DriftAdvice | undefined {
  const pending = session.listPendingAtRisk();
  if (pending.length === 0) {
    return undefined;
  }
  const tokens = pending.reduce((sum, tab) => sum + tab.assessment.estTokens, 0);
  if (tokens < 2_000) {
    return undefined;
  }
  return {
    summary: `${pending.length} tab(s) still add ~${tokens} context tokens`,
    suggestions: [
      "Shield lockfiles and generated artifacts before long agent turns.",
      "Allow only tabs you expect the agent to edit this session.",
    ],
  };
}
