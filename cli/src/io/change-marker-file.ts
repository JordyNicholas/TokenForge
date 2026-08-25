import { appendFile, mkdir, writeFile } from "node:fs/promises";
import type { ProveChangeMarker } from "@tokenforge/risk-core";
import {
  proveChangeLatestPath,
  proveChangesTrailPath,
  tokenforgeDir,
} from "./paths";

export type WriteProveChangeMarkerResult = {
  latestPath: string;
  trailPath: string;
  marker: ProveChangeMarker;
};

/** Persist a Prove change marker under `.tokenforge/` (#95). */
export async function writeProveChangeMarker(
  root: string,
  marker: ProveChangeMarker,
): Promise<WriteProveChangeMarkerResult> {
  const latestPath = proveChangeLatestPath(root);
  const trailPath = proveChangesTrailPath(root);
  const payload = `${JSON.stringify(marker, null, 2)}\n`;
  const trailLine = `${JSON.stringify(marker)}\n`;

  await mkdir(tokenforgeDir(root), { recursive: true });
  await writeFile(latestPath, payload, "utf8");
  await appendFile(trailPath, trailLine, "utf8");

  return { latestPath, trailPath, marker };
}
