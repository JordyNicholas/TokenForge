import type { EffectivenessTier, ShieldMode } from "@tokenforge/context-adapters";

/** Per-tab shield lever audit for UI and Prove. */
export type ShieldLeverRecord = {
  path: string;
  mode: ShieldMode;
  effectiveness: EffectivenessTier;
  modifiedFiles: readonly string[];
};

export type ShieldMetadataStore = {
  get(uri: string): ShieldLeverRecord | undefined;
  set(uri: string, record: ShieldLeverRecord): void;
  delete(uri: string): void;
  clearAll(): void;
  list(): readonly ShieldLeverRecord[];
};

export function createShieldMetadataStore(): ShieldMetadataStore {
  const byUri = new Map<string, ShieldLeverRecord>();

  return {
    get(uri: string) {
      return byUri.get(uri);
    },
    set(uri: string, record: ShieldLeverRecord) {
      byUri.set(uri, record);
    },
    delete(uri: string) {
      byUri.delete(uri);
    },
    clearAll() {
      byUri.clear();
    },
    list() {
      return [...byUri.values()];
    },
  };
}
