import type { Assumptions } from "./assumptions";
import { blendedUsdPerMillion, type Projection } from "./calculator";

/**
 * Advisory tips for F3 (#25 / #26) — heuristic only; no chat access / no live routing.
 */
export type CompactionAdvice = {
  title: string;
  detail: string;
  severity: "info" | "warning";
};

export type RoutingAdvice = {
  title: string;
  detail: string;
  suggestedPremiumShare: number;
};

export function compactionAdvice(input: {
  beforeTokens: number;
  msgsPerDevPerDay: number;
  tokensPerMessage: number;
}): CompactionAdvice {
  const contextHeavy =
    input.tokensPerMessage >= 8000 || input.beforeTokens >= 200_000;
  const chatHeavy = input.msgsPerDevPerDay >= 40;

  if (contextHeavy && chatHeavy) {
    return {
      title: "Compact before long Agent threads",
      detail:
        "High context size and message volume. Suggest summarizing prior turns before resubmit — TokenForge does not rewrite vendor chat history.",
      severity: "warning",
    };
  }
  if (contextHeavy) {
    return {
      title: "Large context — consider compaction",
      detail:
        "Assumed tokens/message or scan before-tokens are high. Prefer leaner attachments and exclusions over carrying full history.",
      severity: "warning",
    };
  }
  return {
    title: "Compaction optional",
    detail:
      "Current assumptions look moderate. Keep monitoring Chat/Agent thread length; this panel is advisory only.",
    severity: "info",
  };
}

export function routingAdvice(
  assumptions: Assumptions,
  projection: Projection,
): RoutingAdvice {
  const blended = blendedUsdPerMillion(assumptions);
  const wastey = projection.scenarioSavedPercent >= 25;
  const premiumHeavy = assumptions.premiumShare >= 0.45;

  if (wastey && premiumHeavy) {
    const suggested = Math.max(0.15, assumptions.premiumShare - 0.2);
    return {
      title: "Shift routine work off premium",
      detail: `Scenario waste is ${projection.scenarioSavedPercent}% with premium mix ${(assumptions.premiumShare * 100).toFixed(0)}% (blended ~$${blended.toFixed(1)}/M). Prefer standard models for triage; reserve premium for hard tasks. Not a live router.`,
      suggestedPremiumShare: suggested,
    };
  }
  if (premiumHeavy) {
    return {
      title: "Premium mix is high",
      detail: `About ${(assumptions.premiumShare * 100).toFixed(0)}% of traffic is on the premium multiplier. Review whether standard models cover everyday Agent turns.`,
      suggestedPremiumShare: Math.max(0.2, assumptions.premiumShare - 0.1),
    };
  }
  return {
    title: "Model mix looks balanced",
    detail: `Premium share ${(assumptions.premiumShare * 100).toFixed(0)}% · blended ~$${blended.toFixed(1)}/M tokens. Adjust Assumptions if your org rate card differs.`,
    suggestedPremiumShare: assumptions.premiumShare,
  };
}
