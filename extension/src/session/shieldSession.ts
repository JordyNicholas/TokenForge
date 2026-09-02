import type { ShieldMode, ShieldResult } from "@tokenforge/context-adapters";
import type { DurableFilterPersistence } from "../filter/durableFilterPersistence";
import { TabFilterStore } from "../filter/filterStore";
import type { TabDecision } from "../filter/types";
import { resolveContextAdapter } from "../providers/detectProvider";
import { resolveWorkspaceRoot } from "../export/writeLastScan";
import {
  createShieldMetadataStore,
  type ShieldLeverRecord,
  type ShieldMetadataStore,
} from "../shield/shieldMetadata";
import { TabRegistry } from "../tabs/registry";
import { RiskSession } from "./riskSession";

type FilterOptions = {
  skipLedger?: boolean;
};

type ShieldOptions = FilterOptions & {
  mode?: ShieldMode;
  skipAdapter?: boolean;
};

/**
 * RiskSession + provider-native Shield levers and audit trail.
 */
export class ShieldSession extends RiskSession {
  readonly shieldMeta: ShieldMetadataStore = createShieldMetadataStore();

  /** Allow (formerly Keep) — clears shield levers when unshielding from filtered. */
  async allow(uri: string): Promise<void> {
    const wasFiltered = this.decision(uri) === "filtered";
    this.keep(uri);
    if (wasFiltered) {
      await this.applyUnshield(uri);
    }
  }

  /** Shield tab — applies context adapter then marks filtered in estimate. */
  async shield(uri: string, options: ShieldOptions = {}): Promise<ShieldResult | undefined> {
    const mode = options.mode ?? "hard";
    if (!options.skipAdapter) {
      const tab = this.registry.get(uri);
      if (tab) {
        const result = await this.applyShield(tab.path, mode);
        this.shieldMeta.set(uri, {
          path: tab.path,
          mode: result.mode,
          effectiveness: result.effectiveness,
          modifiedFiles: result.modifiedFiles,
        });
      }
    }
    this.filter(uri, { skipLedger: options.skipLedger });
    const meta = this.shieldMeta.get(uri);
    return meta
      ? {
          path: meta.path,
          mode: meta.mode,
          effectiveness: meta.effectiveness,
          modifiedFiles: [...meta.modifiedFiles],
          shielded: true,
        }
      : undefined;
  }

  /** Unshield — restore to allowed and remove provider levers. */
  async unshield(uri: string): Promise<void> {
    await this.applyUnshield(uri);
    this.shieldMeta.delete(uri);
    this.clearDecision(uri);
  }

  async shieldAllPending(mode: ShieldMode = "hard"): Promise<number> {
    const pending = this.listPendingAtRisk();
    let count = 0;
    for (const tab of pending) {
      await this.shield(tab.uri, { mode });
      count += 1;
    }
    return count;
  }

  leverRecord(uri: string): ShieldLeverRecord | undefined {
    return this.shieldMeta.get(uri);
  }

  leversAppliedSummary(): readonly ShieldLeverRecord[] {
    return this.shieldMeta.list();
  }

  private async applyShield(path: string, mode: ShieldMode): Promise<ShieldResult> {
    const root = resolveWorkspaceRoot();
    const adapter = await resolveContextAdapter(root);
    return adapter.shield(root, path, mode);
  }

  private async applyUnshield(uri: string): Promise<void> {
    const tab = this.registry.get(uri);
    if (!tab) {
      return;
    }
    const root = resolveWorkspaceRoot();
    const adapter = await resolveContextAdapter(root);
    await adapter.unshield(root, tab.path);
  }
}

/** Factory matching RiskSession constructor signature. */
export function createShieldSession(
  registry: TabRegistry,
  filters?: TabFilterStore,
  durable?: DurableFilterPersistence,
): ShieldSession {
  return new ShieldSession(registry, filters, durable);
}

export type { TabDecision };
