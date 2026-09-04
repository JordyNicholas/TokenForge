import type { ProveChangeMarker } from "@tokenforge/risk-core";
import type { DashboardSeed } from "./seed";
import type {
  DiscoverEntry,
  ProvePackCoverage,
  SessionStatsEntry,
} from "./provePack";
import type { UsageMetrics } from "./usage";

export const PROVE_SESSION_STORAGE_KEY = "tokenforge-prove-session-v1";
/** ~4 MB cap — skip persist with console warn when exceeded. */
export const PROVE_SESSION_MAX_BYTES = 4 * 1024 * 1024;

export type ProveSessionSnapshotV1 = {
  version: 1;
  savedAt: string;
  sourceLabel: string;
  /** Raw org prove-pack JSON when the last load was a pack file. */
  packJsonText?: string;
  /** Inline seed when not restored from a pack file. */
  seed?: DashboardSeed;
  markers: ProveChangeMarker[];
  changeMarkersLabel: string | null;
  sessionStatsEntries: SessionStatsEntry[];
  discoverEntries: DiscoverEntry[];
  coverage: ProvePackCoverage | null;
  provePackLabel: string | null;
  sessionStatsLabel: string | null;
  discoverLatestLabel: string | null;
  usageLabel: string | null;
  usageSnapshots?: Record<string, UsageMetrics>;
  usageSnapshotLabels?: Record<string, string>;
  baselinePeriod?: string | null;
  afterPeriod?: string | null;
};

export type ProveSessionPersistInput = Omit<ProveSessionSnapshotV1, "version" | "savedAt">;

export function shouldAutoRestoreProveSession(
  search: string = typeof window !== "undefined" ? window.location.search : "",
): boolean {
  return new URLSearchParams(search).get("restore") === "1";
}

export function buildProveSessionSnapshot(
  input: ProveSessionPersistInput,
): ProveSessionSnapshotV1 {
  const snapshot: ProveSessionSnapshotV1 = {
    version: 1,
    savedAt: new Date().toISOString(),
    sourceLabel: input.sourceLabel,
    markers: input.markers,
    changeMarkersLabel: input.changeMarkersLabel,
    sessionStatsEntries: input.sessionStatsEntries,
    discoverEntries: input.discoverEntries,
    coverage: input.coverage,
    provePackLabel: input.provePackLabel,
    sessionStatsLabel: input.sessionStatsLabel,
    discoverLatestLabel: input.discoverLatestLabel,
    usageLabel: input.usageLabel,
  };

  if (input.packJsonText) {
    snapshot.packJsonText = input.packJsonText;
  } else if (input.seed) {
    snapshot.seed = input.seed;
  }

  if (input.usageSnapshots && Object.keys(input.usageSnapshots).length > 0) {
    snapshot.usageSnapshots = input.usageSnapshots;
  }
  if (input.usageSnapshotLabels && Object.keys(input.usageSnapshotLabels).length > 0) {
    snapshot.usageSnapshotLabels = input.usageSnapshotLabels;
  }
  if (input.baselinePeriod !== undefined) {
    snapshot.baselinePeriod = input.baselinePeriod;
  }
  if (input.afterPeriod !== undefined) {
    snapshot.afterPeriod = input.afterPeriod;
  }

  return snapshot;
}

export function proveSessionPayloadBytes(snapshot: ProveSessionSnapshotV1): number {
  return new TextEncoder().encode(JSON.stringify(snapshot)).length;
}

export function saveProveSession(input: ProveSessionPersistInput): boolean {
  const snapshot = buildProveSessionSnapshot(input);
  const bytes = proveSessionPayloadBytes(snapshot);
  if (bytes > PROVE_SESSION_MAX_BYTES) {
    console.warn(
      `[TokenForge] Prove session snapshot (${bytes} bytes) exceeds ${PROVE_SESSION_MAX_BYTES} — skipping localStorage persist.`,
    );
    return false;
  }
  try {
    localStorage.setItem(PROVE_SESSION_STORAGE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    console.warn("[TokenForge] Could not persist Prove session to localStorage.");
    return false;
  }
}

export function loadProveSessionSnapshot(): ProveSessionSnapshotV1 | null {
  try {
    const raw = localStorage.getItem(PROVE_SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isProveSessionSnapshotV1(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hasStoredProveSession(): boolean {
  return loadProveSessionSnapshot() !== null;
}

function isProveSessionSnapshotV1(value: unknown): value is ProveSessionSnapshotV1 {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  return (
    v.version === 1 &&
    typeof v.savedAt === "string" &&
    typeof v.sourceLabel === "string" &&
    Array.isArray(v.markers) &&
    (v.packJsonText === undefined || typeof v.packJsonText === "string") &&
    (v.seed === undefined || typeof v.seed === "object")
  );
}
