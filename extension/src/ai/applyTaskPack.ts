import type { ShieldSession } from "../session/shieldSession";
import { buildTaskContextPack, type TaskContextPack } from "./taskContextPack";

export function formatTaskPackClipboard(pack: TaskContextPack): string {
  const lines = pack.paths.map((path) => `- ${path}`).join("\n");
  return [
    `TokenForge task pack (~${pack.estTokens} tokens, ${pack.source}).`,
    "Estimate only — not injected into any agent pipeline. Paste if you want the agent to focus these paths:",
    lines || "(empty pack)",
    pack.note,
  ].join("\n");
}

/**
 * Allow pack paths; soft-Shield other pending at-risk tabs.
 * The focused editor is never Shielded (#262).
 */
export async function applyTaskContextPack(
  session: ShieldSession,
  pack?: TaskContextPack,
): Promise<number> {
  const resolved = pack ?? (await buildTaskContextPack(session));
  const keepPaths = new Set(resolved.paths);
  const activeUri = session.registry.getActiveUri();
  let changes = 0;

  for (const tab of session.listPendingAtRisk()) {
    const isFocused = activeUri !== undefined && tab.uri === activeUri;
    if (keepPaths.has(tab.path) || isFocused) {
      await session.allow(tab.uri);
      changes += 1;
    } else {
      await session.shield(tab.uri, { mode: "soft" });
      changes += 1;
    }
  }

  return changes;
}
