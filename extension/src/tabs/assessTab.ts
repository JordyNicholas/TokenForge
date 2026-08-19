import { scoreRisk } from "@tokenforge/risk-core";
import { TabSnapshot } from "./types";

export function assessTab(snapshot: TabSnapshot, nowMs: number = Date.now()): ReturnType<typeof scoreRisk> {
  const inactiveMs = Math.max(0, nowMs - snapshot.lastActivityAt);
  return scoreRisk({
    path: snapshot.path,
    bytes: snapshot.bytes,
    inactiveMs,
  })
}