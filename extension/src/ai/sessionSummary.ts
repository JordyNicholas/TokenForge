import type { ShieldSession } from "../session/shieldSession";
import { formatTokenCount } from "../ui/formatTokens";

export type SessionSummary = {
  narrative: string;
  contextCost: number;
  sessionSaved: number;
  shieldedCount: number;
};

/** Deterministic session summary for Overview (optional LLM can wrap this later). */
export function buildSessionSummary(session: ShieldSession): SessionSummary {
  const contextCost = session.displayAtRiskTokens();
  const sessionSaved = session.sessionAvoidedTokens();
  const shieldedCount = session.listFilteredAtRisk().length;
  const levers = session.leversAppliedSummary().length;

  const parts = [
    `Context cost now: ${formatTokenCount(contextCost)}.`,
    sessionSaved > 0
      ? `Session saved: ${formatTokenCount(sessionSaved)} (estimate hygiene).`
      : undefined,
    shieldedCount > 0
      ? `${shieldedCount} tab(s) Shielded this window.`
      : undefined,
    levers > 0 ? `${levers} provider lever(s) applied.` : undefined,
  ].filter(Boolean);

  return {
    narrative: parts.join(" "),
    contextCost,
    sessionSaved,
    shieldedCount,
  };
}
