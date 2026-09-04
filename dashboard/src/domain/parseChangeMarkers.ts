import {
  isProveChangeMarker,
  type ProveChangeMarker,
} from "@tokenforge/risk-core";

export class ChangeMarkerLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChangeMarkerLoadError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse a Prove change-marker JSON document (#96).
 * Accepts a single marker, `{ markers: [...] }`, or a bare array.
 */
export function parseChangeMarkersJson(text: string): ProveChangeMarker[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new ChangeMarkerLoadError("Change markers file is not valid JSON.");
  }

  if (isProveChangeMarker(raw)) {
    return [raw];
  }
  if (Array.isArray(raw)) {
    if (!raw.every(isProveChangeMarker)) {
      throw new ChangeMarkerLoadError(
        "Change markers array must contain ProveChangeMarker objects.",
      );
    }
    return raw;
  }
  if (isRecord(raw) && Array.isArray(raw.markers)) {
    if (!raw.markers.every(isProveChangeMarker)) {
      throw new ChangeMarkerLoadError(
        "markers[] must contain ProveChangeMarker objects.",
      );
    }
    return raw.markers;
  }
  throw new ChangeMarkerLoadError(
    "Expected a ProveChangeMarker, an array, or { markers: [...] }.",
  );
}

export async function parseChangeMarkersFile(
  file: File,
): Promise<ProveChangeMarker[]> {
  const text = await file.text();
  return parseChangeMarkersJson(text);
}

/** Unique key for deduping markers when merging additional loads. */
export function changeMarkerKey(marker: ProveChangeMarker): string {
  return `${marker.team ?? ""}:${marker.timestamp}:${marker.packId}`;
}

/** Append incoming markers; later duplicates (team+timestamp+packId) are skipped. */
export function mergeChangeMarkers(
  existing: readonly ProveChangeMarker[],
  incoming: readonly ProveChangeMarker[],
): ProveChangeMarker[] {
  const seen = new Set(existing.map(changeMarkerKey));
  const merged = [...existing];
  for (const marker of incoming) {
    const key = changeMarkerKey(marker);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(marker);
  }
  return merged;
}
