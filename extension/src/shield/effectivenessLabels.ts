import type { EffectivenessTier, ShieldMode } from "@tokenforge/context-adapters";

const EFFECTIVENESS_LABEL: Record<EffectivenessTier, string> = {
  full: "full — provider honors shield reliably",
  partial: "partial — indexing/context may still leak",
  advisory: "advisory — guidance only, not enforced",
};

const MODE_LABEL: Record<ShieldMode, string> = {
  soft: "Soft",
  hard: "Hard",
};

/** Human-readable Shield lever badge for tree / Overview. */
export function formatShieldBadge(mode: ShieldMode, effectiveness: EffectivenessTier): string {
  return `${MODE_LABEL[mode]} · ${effectiveness}`;
}

export function effectivenessTooltip(mode: ShieldMode, effectiveness: EffectivenessTier): string {
  return `${MODE_LABEL[mode]} Shield — ${EFFECTIVENESS_LABEL[effectiveness]}. Honest tiers from context-adapters; not pipeline interception.`;
}

export type ShieldEffectivenessRollup = {
  label: string;
  count: number;
  mode: ShieldMode;
  effectiveness: EffectivenessTier;
};

/** Group session Shield levers by mode + effectiveness for summary badges. */
export function rollupShieldEffectiveness(
  records: ReadonlyArray<{ mode: ShieldMode; effectiveness: EffectivenessTier }>,
): ShieldEffectivenessRollup[] {
  const counts = new Map<string, ShieldEffectivenessRollup>();
  for (const record of records) {
    const label = formatShieldBadge(record.mode, record.effectiveness);
    const existing = counts.get(label);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(label, {
        label,
        count: 1,
        mode: record.mode,
        effectiveness: record.effectiveness,
      });
    }
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
