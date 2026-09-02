import type { ShieldSession } from "../session/shieldSession";

export type TaskContextPack = {
  paths: readonly string[];
  estTokens: number;
  note: string;
};

/** Heuristic stub — top allowed/pending tabs as a lightweight task pack. */
export function buildTaskContextPack(session: ShieldSession): TaskContextPack {
  const tabs = session
    .listDisplayAtRisk()
    .slice()
    .sort((a, b) => b.assessment.estTokens - a.assessment.estTokens)
    .slice(0, 8);
  const estTokens = tabs.reduce((sum, tab) => sum + tab.assessment.estTokens, 0);
  return {
    paths: tabs.map((tab) => tab.path),
    estTokens,
    note: "Estimate-only task focus list — not sent to any agent pipeline.",
  };
}
