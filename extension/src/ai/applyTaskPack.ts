import type { ShieldSession } from "../session/shieldSession";
import { buildTaskContextPack } from "./taskContextPack";

/** Apply task pack: Allow listed paths, Shield other pending at-risk tabs. */
export async function applyTaskContextPack(session: ShieldSession): Promise<number> {
  const pack = await buildTaskContextPack(session);
  const keepPaths = new Set(pack.paths);
  let changes = 0;

  for (const tab of session.listPendingAtRisk()) {
    if (keepPaths.has(tab.path)) {
      await session.allow(tab.uri);
      changes += 1;
    } else {
      await session.shield(tab.uri, { mode: "soft" });
      changes += 1;
    }
  }

  return changes;
}
