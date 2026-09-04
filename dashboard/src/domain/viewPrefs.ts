import { parseScanLayerId, type ScanLayerId } from "./layers";

const PREFERRED_LAYER_KEY = "tokenforge-preferred-layer";

export function readPreferredScanLayer(fallback: ScanLayerId = "combined"): ScanLayerId {
  try {
    const stored = localStorage.getItem(PREFERRED_LAYER_KEY);
    const parsed = stored ? parseScanLayerId(stored) : null;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

export function writePreferredScanLayer(layer: ScanLayerId): void {
  try {
    localStorage.setItem(PREFERRED_LAYER_KEY, layer);
  } catch {
    /* private mode */
  }
}
