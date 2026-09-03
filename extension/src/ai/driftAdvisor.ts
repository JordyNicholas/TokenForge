import type { ShieldSession } from "../session/shieldSession";

export type DriftAdvice = {
  summary: string;
  suggestions: readonly string[];
};

/**
 * Session-signal drift (#258): pending growth, stale focused file, noisy classes.
 * Does not read chat history.
 */
export function adviseContextDrift(
  session: ShieldSession,
  nowMs: number = Date.now(),
): DriftAdvice | undefined {
  const pending = session.listPendingAtRisk(nowMs);
  if (pending.length === 0) {
    return undefined;
  }
  const tokens = pending.reduce((sum, tab) => sum + tab.assessment.estTokens, 0);
  const suggestions: string[] = [];
  const activeUri = session.registry.getActiveUri();
  const focused = pending.find((tab) => tab.uri === activeUri);

  if (focused?.assessment.reasons.includes("inactive_tab")) {
    suggestions.push(
      `Focused file ${focused.path} is already idle — Shield background noise or switch files before a long agent turn.`,
    );
  }

  const noisy = pending.filter((tab) =>
    ["lockfile", "generated", "media", "test_output"].includes(tab.assessment.fileClass),
  );
  if (noisy.length > 0) {
    suggestions.push(
      `Shield ${noisy.length} lockfile/generated/media tab(s) still in Needs review.`,
    );
  }

  if (pending.length >= 3 && tokens >= 2_000) {
    suggestions.push("Allow only tabs you expect the agent to edit this session.");
  }

  if (suggestions.length === 0) {
    if (tokens < 2_000) {
      return undefined;
    }
    suggestions.push("Shield lockfiles and generated artifacts before long agent turns.");
  }

  return {
    summary: `${pending.length} pending tab(s) still add ~${tokens} context tokens`,
    suggestions,
  };
}
